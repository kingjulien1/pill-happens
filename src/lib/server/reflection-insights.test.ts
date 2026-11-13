import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, type AppData } from "@/lib/domain";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import type {
  ReflectionInsightRequest,
  ReflectionInsightResponse,
} from "@/lib/reflection-insights";
import {
  createPostgresJournalRepository,
  type JournalRepository,
  type Query,
} from "./journal-repository";
import { createLocalJournalRepository } from "./local-journal-repository";
import { mutateJournalState, readJournalState } from "./journal-state";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getReflectionInsight,
  reflectionInsightRequestSchema,
  reflectionNoteHash,
  REFLECTION_INSIGHT_LEASE_MS,
  REFLECTION_INSIGHT_RETRY_MS,
} from "./reflection-insights";
import { upsertDailyCheckIn } from "./daily-check-ins";
import { dailyCheckInSchema } from "./validation";

const note =
  "Today I took a quiet walk through the park and wrote about the small details that helped me feel more grounded at home.";
const input: ReflectionInsightRequest = {
  day: "2026-11-07",
  period: "morning",
  note,
};
const content = {
  summary: "A quiet walk and small details brought a sense of grounding.",
  advice: [
    "Write down one detail you would like to notice again.",
    "Leave a little space for another quiet walk.",
  ],
};
const now = Date.parse("2026-11-07T09:00:00.000Z");

function originalCheckIn(): DailyCheckIn {
  return {
    ...input,
    moods: ["okay"],
    energy: 3,
    stress: 2,
    sleepHours: null,
    helped: "A walk",
    createdAt: "2026-11-07T08:00:00.000Z",
    updatedAt: "2026-11-07T08:10:00.000Z",
  };
}

function memoryRepository() {
  let state: AppData = { ...emptyData(), dailyCheckIns: [originalCheckIn()] };
  let writes = 0;
  let queue = Promise.resolve();
  const repository: Pick<JournalRepository, "readState" | "mutateState"> = {
    async readState() {
      await queue;
      return structuredClone(state);
    },
    async mutateState(_journalId, mutate) {
      const work = queue.then(() => {
        const copy = structuredClone(state);
        mutate(copy);
        state = copy;
        writes++;
        return structuredClone(state);
      });
      queue = work.then(
        () => undefined,
        () => undefined,
      );
      return work;
    },
  };
  return { repository, writes: () => writes };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

test("source fingerprints retain Markdown whitespace and every original string code unit", () => {
  assert.notEqual(reflectionNoteHash(note), reflectionNoteHash(`${note} `));
  assert.notEqual(reflectionNoteHash("\ud800"), reflectionNoteHash("\ud801"));
  assert.notEqual(reflectionNoteHash("\ud800"), reflectionNoteHash("\ufffd"));
});

test("new insights use two writes; unchanged notes, reloads and mood-only edits use the persisted result", async () => {
  const { repository, writes } = memoryRepository();
  let calls = 0;
  const options = {
    configured: true,
    now: () => now,
    generate: async () => {
      calls++;
      return content;
    },
  };
  const result = await getReflectionInsight(
    repository,
    "personal",
    input,
    options,
  );
  assert.equal(result.status, "ready");
  assert.equal(writes(), 2);
  assert.equal(calls, 1);
  assert.deepEqual((await repository.readState("personal")).dailyCheckIns, [
    originalCheckIn(),
  ]);
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, options),
    result,
  );
  assert.equal(writes(), 2);
  await repository.mutateState("personal", (state) => {
    const entry = state.dailyCheckIns![0];
    entry.moods = ["calm"];
    entry.updatedAt = "2026-11-07T10:00:00.000Z";
  });
  const before = writes();
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, {
      ...options,
      configured: false,
    }),
    result,
  );
  assert.equal(writes(), before);
  assert.equal(calls, 1);
});

test("twenty words, unsaved notes and missing configuration perform no generation or writes", async () => {
  const { repository, writes } = memoryRepository();
  const generate = async () => {
    throw new Error("Must not call provider.");
  };
  const options = { configured: true, generate, now: () => now };
  const twenty = Array.from({ length: 20 }, () => "word").join(" ");
  assert.deepEqual(
    await getReflectionInsight(
      repository,
      "personal",
      { ...input, note: twenty },
      options,
    ),
    { status: "unavailable", reason: "too_short" },
  );
  assert.deepEqual(
    await getReflectionInsight(
      repository,
      "personal",
      { ...input, note: `${note} Changed` },
      options,
    ),
    { status: "unavailable", reason: "save_first" },
  );
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, {
      ...options,
      configured: false,
    }),
    { status: "unavailable", reason: "not_configured" },
  );
  assert.equal(writes(), 0);
  assert.equal(
    reflectionInsightRequestSchema.safeParse({
      ...input,
      note: "x".repeat(100001),
    }).success,
    false,
  );
  assert.equal(
    reflectionInsightRequestSchema.safeParse({ ...input, period: "noon" })
      .success,
    false,
  );
  assert.equal(
    reflectionInsightRequestSchema.safeParse({ ...input, day: "2026-02-30" })
      .success,
    false,
  );
});

test("simultaneous requests observe one persistent lease with no duplicate generation or pending writes", async () => {
  const { repository, writes } = memoryRepository();
  const started = deferred<void>();
  const finish = deferred<typeof content>();
  let calls = 0;
  const options = {
    configured: true,
    now: () => now,
    generate: () => {
      calls++;
      started.resolve();
      return finish.promise;
    },
  };
  const first = getReflectionInsight(repository, "personal", input, options);
  await started.promise;
  const second = await getReflectionInsight(
    repository,
    "personal",
    input,
    options,
  );
  assert.equal(second.status, "pending");
  assert.equal(writes(), 1);
  assert.equal(calls, 1);
  finish.resolve(content);
  assert.equal((await first).status, "ready");
  assert.equal(writes(), 2);
});

test("failures persist and require an explicit retry after sixty seconds", async () => {
  const { repository, writes } = memoryRepository();
  let time = now;
  let calls = 0;
  const options = {
    configured: true,
    now: () => time,
    generate: async () => {
      calls++;
      throw new Error("Synthetic provider error");
    },
  };
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, options),
    {
      status: "unavailable",
      reason: "failed",
      retryAfterMs: REFLECTION_INSIGHT_RETRY_MS,
    },
  );
  time += REFLECTION_INSIGHT_RETRY_MS - 1;
  assert.deepEqual(
    await getReflectionInsight(
      repository,
      "personal",
      { ...input, retry: true },
      options,
    ),
    { status: "unavailable", reason: "failed", retryAfterMs: 1 },
  );
  time += 10;
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, options),
    { status: "unavailable", reason: "failed", retryAfterMs: 0 },
  );
  assert.equal(calls, 1);
  assert.equal(writes(), 2);
  const retry = await getReflectionInsight(
    repository,
    "personal",
    { ...input, retry: true },
    {
      ...options,
      generate: async () => {
        calls++;
        return content;
      },
    },
  );
  assert.equal(retry.status, "ready");
  assert.equal(calls, 2);
  assert.equal(writes(), 4);
});

test("edited text never receives a stale result, but A to B to A reuses exact-text history", async () => {
  const { repository } = memoryRepository();
  const started = deferred<void>();
  const finish = deferred<typeof content>();
  let calls = 0;
  const first = getReflectionInsight(repository, "personal", input, {
    configured: true,
    now: () => now,
    generate: () => {
      calls++;
      started.resolve();
      return finish.promise;
    },
  });
  await started.promise;
  const changed = `${note} I also put my plans for tomorrow on paper.`;
  await repository.mutateState("personal", (state) => {
    state.dailyCheckIns![0].note = changed;
  });
  finish.resolve(content);
  assert.deepEqual(await first, { status: "unavailable", reason: "changed" });
  const b = await getReflectionInsight(
    repository,
    "personal",
    { ...input, note: changed },
    {
      configured: true,
      now: () => now + 1,
      generate: async () => {
        calls++;
        return content;
      },
    },
  );
  assert.equal(b.status, "ready");
  await repository.mutateState("personal", (state) => {
    state.dailyCheckIns![0].note = note;
  });
  assert.equal(
    (
      await getReflectionInsight(repository, "personal", input, {
        configured: true,
        generate: async () => {
          throw new Error("Must reuse A.");
        },
      })
    ).status,
    "ready",
  );
  assert.equal(calls, 2);
});

test("an expired owner cannot overwrite or release a newer owner's result", async () => {
  const { repository } = memoryRepository();
  let time = now;
  const started = deferred<void>();
  const oldResult = deferred<typeof content>();
  const first = getReflectionInsight(repository, "personal", input, {
    configured: true,
    now: () => time,
    token: () => "old",
    generate: () => {
      started.resolve();
      return oldResult.promise;
    },
  });
  await started.promise;
  time += REFLECTION_INSIGHT_LEASE_MS + 1;
  const newer = {
    ...content,
    summary: "The newer owner completed this reflection.",
  };
  const second = await getReflectionInsight(repository, "personal", input, {
    configured: true,
    now: () => time,
    token: () => "new",
    generate: async () => newer,
  });
  assert.equal(second.status, "ready");
  oldResult.resolve(content);
  assert.deepEqual(await first, second);
  assert.equal(
    (await repository.readState("personal")).reflectionInsights?.[0].status,
    "ready",
  );
  assert.deepEqual(
    await getReflectionInsight(repository, "personal", input, {
      configured: false,
      generate: async () => content,
    }),
    second,
  );
});

test("a note changing before the atomic claim aborts without a write or provider call", async () => {
  const { repository, writes } = memoryRepository();
  let changed = false;
  const guarded: typeof repository = {
    readState: repository.readState,
    async mutateState(journalId, mutate) {
      if (!changed) {
        changed = true;
        await repository.mutateState(journalId, (state) => {
          state.dailyCheckIns![0].note = `${note} A newer saved version.`;
        });
      }
      return repository.mutateState(journalId, mutate);
    },
  };
  assert.deepEqual(
    await getReflectionInsight(guarded, "personal", input, {
      configured: true,
      generate: async () => {
        throw new Error("Must never reach provider.");
      },
    }),
    { status: "unavailable", reason: "changed" },
  );
  assert.equal(writes(), 1, "only the competing note save wrote state");
  assert.equal(
    (await repository.readState("personal")).reflectionInsights,
    undefined,
  );
});

test("late historical completions cannot evict the unchanged current note's result", async () => {
  const { repository } = memoryRepository();
  await getReflectionInsight(repository, "personal", input, {
    configured: true,
    now: () => now,
    generate: async () => content,
  });
  const finish = Array.from({ length: 5 }, () => deferred<typeof content>());
  const jobs: Promise<ReflectionInsightResponse>[] = [];
  for (let index = 0; index < finish.length; index++) {
    const version = `${note} Pending historical variant ${index}.`;
    await repository.mutateState("personal", (state) => {
      state.dailyCheckIns![0].note = version;
    });
    const started = deferred<void>();
    jobs.push(
      getReflectionInsight(
        repository,
        "personal",
        { ...input, note: version },
        {
          configured: true,
          now: () => now + index + 1,
          generate: () => {
            started.resolve();
            return finish[index].promise;
          },
        },
      ),
    );
    await started.promise;
  }
  await repository.mutateState("personal", (state) => {
    state.dailyCheckIns![0].note = note;
  });
  // Five newer variants may have pruned A while it was historical. Once A is
  // current again, its ready result must survive all older in-flight finishes.
  await getReflectionInsight(repository, "personal", input, {
    configured: true,
    now: () => now + 10,
    generate: async () => content,
  });
  for (let index = 0; index < jobs.length; index++) {
    finish[index].resolve(content);
    assert.equal((await jobs[index]).status, "unavailable");
  }
  const state = await repository.readState("personal");
  assert.ok(
    state.reflectionInsights?.some(
      (entry) =>
        entry.status === "ready" && entry.noteHash === reflectionNoteHash(note),
    ),
  );
  assert.equal(state.reflectionInsights?.length, 4);
  assert.equal(
    (
      await getReflectionInsight(repository, "personal", input, {
        configured: true,
        generate: async () => {
          throw new Error("Current result must remain cached.");
        },
      })
    ).status,
    "ready",
  );
});

test("CAS contention rechecks ownership before provider use and preserves concurrent journal edits", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  let compete: (() => Promise<void>) | undefined;
  let updates = 0;
  const query: Query = async (sql, params = []) => {
    if (sql.startsWith("UPDATE pill_happens_state SET data")) {
      updates++;
      if (compete) {
        const run = compete;
        compete = undefined;
        await run();
      }
    }
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  };
  const firstRepo = createPostgresJournalRepository(query);
  const otherRepo = createPostgresJournalRepository(query);
  await firstRepo.mutateState("personal", (state) => {
    state.dailyCheckIns = [originalCheckIn()];
  });
  await otherRepo.readState("personal");
  const started = deferred<void>();
  const finish = deferred<typeof content>();
  let owner: Promise<ReflectionInsightResponse> | undefined;
  let calls = 0;
  compete = async () => {
    await otherRepo.mutateState("personal", (state) => {
      state.dailyCheckIns![0].stress = 4;
    });
    owner = getReflectionInsight(otherRepo, "personal", input, {
      configured: true,
      now: () => now,
      generate: () => {
        calls++;
        started.resolve();
        return finish.promise;
      },
    });
    await started.promise;
  };
  const loser = await getReflectionInsight(firstRepo, "personal", input, {
    configured: true,
    now: () => now,
    generate: async () => {
      calls++;
      return content;
    },
  });
  assert.equal(loser.status, "pending");
  assert.equal(calls, 1);
  const before = updates;
  assert.equal(
    (
      await getReflectionInsight(firstRepo, "personal", input, {
        configured: true,
        now: () => now,
        generate: async () => content,
      })
    ).status,
    "pending",
  );
  assert.equal(updates, before);
  finish.resolve(content);
  assert.equal((await owner!).status, "ready");
  const saved = await readJournalState(firstRepo, "personal");
  assert.equal(saved.dailyCheckIns![0].stress, 4);
  assert.equal(saved.dailyCheckIns![0].updatedAt, originalCheckIn().updatedAt);
  const cached = structuredClone(saved.reflectionInsights);
  await mutateJournalState(firstRepo, "personal", (state) =>
    upsertDailyCheckIn(
      state,
      dailyCheckInSchema.parse({ ...originalCheckIn(), energy: 4 }),
      new Date(now + 1000),
    ),
  );
  assert.deepEqual(
    (await firstRepo.readState("personal")).reflectionInsights,
    cached,
  );
  const exported = JSON.parse(
    JSON.stringify(await readJournalState(firstRepo, "personal")),
  );
  assert.deepEqual(exported.reflectionInsights, cached);
});

test("new cache survives local reopen and keeps four versions without evicting other entries", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "pill-insight-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repository = createLocalJournalRepository(directory);
  await repository.mutateState("personal", (state) => {
    state.dailyCheckIns = [
      originalCheckIn(),
      { ...originalCheckIn(), period: "evening" },
    ];
  });
  await getReflectionInsight(
    repository,
    "personal",
    { ...input, period: "evening" },
    { configured: true, now: () => now, generate: async () => content },
  );
  for (let index = 0; index < 6; index++) {
    const version = `${note} Version ${index}.`;
    await repository.mutateState("personal", (state) => {
      state.dailyCheckIns![0].note = version;
    });
    await getReflectionInsight(
      repository,
      "personal",
      { ...input, note: version },
      {
        configured: true,
        now: () => now + index + 1,
        generate: async () => content,
      },
    );
  }
  const reopened = createLocalJournalRepository(directory);
  const state = await readJournalState(reopened, "personal");
  assert.equal(
    state.reflectionInsights?.filter((entry) => entry.period === "morning")
      .length,
    4,
  );
  assert.equal(
    state.reflectionInsights?.filter((entry) => entry.period === "evening")
      .length,
    1,
  );
  assert.equal(
    state.reflectionInsights?.find((entry) => entry.period === "evening")
      ?.noteHash,
    reflectionNoteHash(note),
  );
});
