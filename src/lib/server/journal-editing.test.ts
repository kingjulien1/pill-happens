import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  emptyData,
  shiftDayKey,
  type AppData,
  type Medication,
} from "@/lib/domain";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import type { JournalEnhancementInput } from "@/lib/journal-enhancement";
import { formatJournalEntryHeading } from "@/lib/journal-entry-template";
import {
  JOURNAL_EDITING_BATCH_SIZE,
  JOURNAL_EDITING_BUDGET_MS,
  JOURNAL_EDITING_LEASE_MS,
  JOURNAL_EDITING_POLICY,
  JournalEditingConflict,
  journalEditingAuthorized,
  journalEditingContext,
  journalNoteHash,
  restoreJournalEditingRevision,
  runJournalEditing,
  saveReviewedJournalEntry,
} from "./journal-editing";
import {
  createPostgresJournalRepository,
  type JournalRepository,
} from "./journal-repository";
import { readJournalState } from "./journal-state";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = "2026-11-14T12:00:00.000Z";
const now = () => new Date(NOW);
type Repository = Pick<JournalRepository, "readState" | "mutateState">;

function entry(
  day = "2026-11-10",
  overrides: Partial<DailyCheckIn> = {},
): DailyCheckIn {
  return {
    day,
    period: "evening",
    note: "a quiet day. kinda tired lol.",
    moods: ["tired"],
    energy: 2,
    stress: 3,
    sleepHours: 7,
    helped: "A walk helped.",
    createdAt: `${day}T20:00:00.000Z`,
    updatedAt: `${day}T20:00:00.000Z`,
    ...overrides,
  };
}

function state(entries: DailyCheckIn[] = [entry()]): AppData {
  return { ...emptyData(), dailyCheckIns: entries };
}

function medication(id: string, name: string): Medication {
  return {
    id,
    name,
    strengthMg: 1,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: NOW,
  };
}

/** A serial, copy-on-write repository: failed callbacks never leak changes. */
function memory(initial: Record<string, AppData> = { [OWNER]: state() }) {
  const states = new Map(
    Object.entries(initial).map(([id, value]) => [id, structuredClone(value)]),
  );
  const accesses: { kind: "read" | "write"; id: string }[] = [];
  let queue: Promise<void> = Promise.resolve();
  const repository: Repository = {
    async readState(id) {
      accesses.push({ kind: "read", id });
      await queue;
      const value = states.get(id);
      if (!value) throw new Error("Missing synthetic journal.");
      return structuredClone(value);
    },
    mutateState(id, mutate) {
      accesses.push({ kind: "write", id });
      const work = queue.then(() => {
        const value = states.get(id);
        if (!value) throw new Error("Missing synthetic journal.");
        const next = structuredClone(value);
        mutate(next);
        states.set(id, next);
        return structuredClone(next);
      });
      queue = work.then(
        () => undefined,
        () => undefined,
      );
      return work;
    },
  };
  return { repository, accesses };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const polished = async (input: JournalEnhancementInput) => ({
  markdown: `${formatJournalEntryHeading(input.day)} A quiet little update\n\n${input.note}`,
  summary: "A quiet little update",
});

test("journal editing cron authorization fails closed and matches only the exact bearer", () => {
  const secret = "synthetic-cron-secret-with-at-least-32-characters";
  assert.equal(journalEditingAuthorized(`Bearer ${secret}`, secret), true);
  for (const authorization of [
    null,
    "",
    secret,
    `bearer ${secret}`,
    `Bearer ${secret} `,
    `Bearer ${secret.slice(0, -1)}x`,
    `Bearer ${"🌿".repeat(secret.length)}`,
  ])
    assert.equal(journalEditingAuthorized(authorization, secret), false);
  assert.equal(journalEditingAuthorized(`Bearer ${secret}`), false);
  assert.equal(journalEditingAuthorized("Bearer short", "short"), false);
});

test("invalid journal scopes and batch limits never reach the repository or provider", async () => {
  const { repository, accesses } = memory();
  let requests = 0;
  const generate = async (input: JournalEnhancementInput) => {
    requests++;
    return polished(input);
  };
  for (const journalId of [
    "",
    "personal ",
    "other",
    "../../personal",
    OWNER.toUpperCase(),
  ])
    await assert.rejects(
      runJournalEditing({ repository, journalId, generate, now }),
      /Invalid journal editing scope/u,
    );
  for (const limit of [0, 51, 1.5, NaN])
    await assert.rejects(
      runJournalEditing({ repository, journalId: OWNER, generate, now, limit }),
      /Invalid journal editing scope/u,
    );
  assert.deepEqual(accesses, []);
  assert.equal(requests, 0);
});

test("reference context rejects ambiguous medication names and pins relative dates to the written day", () => {
  const data = state();
  const medication = {
    strengthMg: 1,
    form: "tablet" as const,
    color: "rose" as const,
    archived: false,
    createdAt: NOW,
  };
  data.medications = [
    {
      ...medication,
      id: "aurora",
      name: "Aurora",
      activeIngredient: "Example Salt",
    },
    { ...medication, id: "shared-one", name: "Shared" },
    { ...medication, id: "shared-two", name: "Shared", strengthMg: 2 },
    {
      ...medication,
      id: "unused-private-medication",
      name: "Never mentioned",
      activeIngredient: "Unmentioned Ingredient",
    },
  ];
  const note =
    "Aurora and Shared yesterday. /Today.Morning /Yesterday.Evening /LastWeek; 1/2 tablets, 1.5 mg and 2.5 mg. 10.11.2026 and 2026-11-11.";
  const context = journalEditingContext(data, entry("2026-11-10", { note }));
  const refs = context.allowedReferences!;
  assert.equal(context.day, "2026-11-10");
  assert.equal(context.timezone, "Europe/Vienna");
  assert.deepEqual(
    context.medications,
    data.medications.slice(0, 3).map(({ id, name, activeIngredient }) => ({
      id,
      name,
      activeIngredient,
    })),
  );
  assert.ok(
    !context.medications!.some(
      (value) => value.id === "unused-private-medication",
    ),
  );
  assert.ok(
    refs.some(
      (ref) =>
        ref.label.toLowerCase() === "aurora" &&
        ref.href === "/medications?medication=aurora",
    ),
  );
  assert.ok(!refs.some((ref) => ref.label.toLowerCase() === "shared"));
  assert.ok(
    refs.some(
      (ref) =>
        ref.label.toLowerCase() === "yesterday" &&
        ref.href === "/history/2026-11-09",
    ),
  );
  assert.ok(refs.some((ref) => ref.href === "/journal/2026-11-10/morning"));
  assert.ok(refs.some((ref) => ref.href === "/journal/2026-11-09/evening"));
  assert.ok(refs.some((ref) => ref.href === "/history/weeks/2026-11-02"));
  assert.ok(
    refs.some(
      (ref) => ref.label === "10.11.2026" && ref.href === "/history/2026-11-10",
    ),
  );
  assert.ok(
    !refs.some((ref) =>
      ["1/2", "1.5", "2.5", "2026-11-11"].includes(ref.label),
    ),
  );
});

test("only completed tracking days are edited across the Vienna 06:00 and DST boundaries", async () => {
  for (const [instant, day, expected] of [
    ["2026-10-25T04:59:59.999Z", "2026-10-24", 0],
    ["2026-10-25T05:00:00.000Z", "2026-10-24", 1],
    ["2026-03-29T03:59:59.999Z", "2026-03-28", 0],
    ["2026-03-29T04:00:00.000Z", "2026-03-28", 1],
  ] as const) {
    const { repository } = memory({ [OWNER]: state([entry(day)]) });
    let requests = 0;
    const report = await runJournalEditing({
      repository,
      journalId: OWNER,
      now: () => new Date(instant),
      generate: async (input) => {
        requests++;
        return polished(input);
      },
    });
    assert.equal(requests, expected, instant);
    assert.equal(report.reviewed, expected, instant);
  }
});

test("the default batch edits the oldest eight eligible entries and leaves blank, current and future days alone", async () => {
  const eligible = Array.from({ length: 10 }, (_, index) =>
    entry(shiftDayKey("2026-11-01", index)),
  );
  const ignored = [
    entry("2026-11-14"),
    entry("2026-11-15"),
    entry("2026-02-30"),
    entry("2026-10-29", { note: " \n " }),
    entry("2026-10-30", { note: "# Fri, Oct 30 --\n" }),
  ];
  const { repository } = memory({
    [OWNER]: state([...ignored, ...eligible.toReversed()]),
  });
  const requested: string[] = [];
  const report = await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      requested.push(input.day);
      return polished(input);
    },
  });
  assert.equal(JOURNAL_EDITING_BATCH_SIZE, 8);
  assert.deepEqual(
    requested,
    eligible.slice(0, 8).map((value) => value.day),
  );
  assert.deepEqual(report, {
    reviewed: 8,
    changed: 8,
    skipped: 0,
    failed: 0,
    remaining: 2,
    busy: false,
  });
  const saved = await repository.readState(OWNER);
  for (const value of ignored)
    assert.deepEqual(
      saved.dailyCheckIns!.find((checkIn) => checkIn.day === value.day),
      value,
    );
});

test("the deterministic execution budget stops new provider requests with time reserved for the final write", async () => {
  const seed = state(
    Array.from({ length: 10 }, (_, index) =>
      entry(shiftDayKey("2026-11-01", index)),
    ),
  );
  const { repository } = memory({ [OWNER]: seed });
  let elapsed = 0;
  let requests = 0;
  const report = await runJournalEditing({
    repository,
    journalId: OWNER,
    limit: 10,
    now: () => new Date(Date.parse(NOW) + elapsed),
    generate: async (input) => {
      requests++;
      elapsed += 61_000;
      return polished(input);
    },
  });
  assert.equal(JOURNAL_EDITING_BUDGET_MS, 240_000);
  assert.equal(requests, 3);
  assert.equal(report.reviewed, 3);
  assert.equal(report.remaining, 7);
  assert.equal(
    (await repository.readState(OWNER)).journalEditing?.lease,
    undefined,
  );
});

test("hash deduplication includes unchanged reviews, survives the next day, and permits a later manual edit", async () => {
  const { repository } = memory({
    [OWNER]: state([
      entry("2026-11-10", {
        note: "# Tue, Nov 10 -- A quiet update\n\na quiet day. kinda tired lol.",
      }),
    ]),
  });
  let requests = 0;
  const generate = async (input: JournalEnhancementInput) => {
    requests++;
    return { markdown: input.note, summary: "A quiet update" };
  };
  const first = await runJournalEditing({
    repository,
    journalId: OWNER,
    generate,
    now,
  });
  assert.equal(first.reviewed, 1);
  assert.equal(first.changed, 0);
  const afterReview = await repository.readState(OWNER);
  assert.equal(afterReview.dailyCheckIns![0].updatedAt, entry().updatedAt);
  assert.equal(
    afterReview.journalEditing!.revisions[0].sourceHash,
    afterReview.journalEditing!.revisions[0].outputHash,
  );
  await runJournalEditing({
    repository,
    journalId: OWNER,
    generate,
    now: () => new Date("2026-11-15T12:00:00Z"),
  });
  assert.equal(requests, 1);
  await repository.mutateState(OWNER, (data) => {
    data.dailyCheckIns![0].note += " Another thought.";
    data.dailyCheckIns![0].updatedAt = "2026-11-15T12:01:00.000Z";
  });
  const second = await runJournalEditing({
    repository,
    journalId: OWNER,
    generate,
    now: () => new Date("2026-11-16T12:00:00Z"),
  });
  assert.equal(second.reviewed, 1);
  assert.equal(requests, 2);
  assert.equal(
    (await repository.readState(OWNER)).journalEditing!.revisions.length,
    2,
  );
});

test("provider failure retains the exact original and releases its lease without storing an error body", async () => {
  const seed = state();
  const { repository } = memory({ [OWNER]: seed });
  const report = await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async () => {
      throw new Error("synthetic private provider failure body");
    },
  });
  assert.deepEqual(report, {
    reviewed: 0,
    changed: 0,
    skipped: 0,
    failed: 1,
    remaining: 1,
    busy: false,
  });
  const saved = await repository.readState(OWNER);
  assert.deepEqual(saved.dailyCheckIns, seed.dailyCheckIns);
  assert.deepEqual(saved.journalEditing!.revisions, []);
  assert.equal(saved.journalEditing!.lease, undefined);
  assert.equal(saved.journalEditing!.lastRun!.failed, 1);
  assert.doesNotMatch(
    JSON.stringify(saved),
    /synthetic private provider failure body/u,
  );
});

test("failed oldest entries cool down so the next daily batch progresses and retries resume after 48 hours", async () => {
  const entries = Array.from({ length: 16 }, (_, index) =>
    entry(shiftDayKey("2026-10-20", index)),
  );
  const { repository } = memory({ [OWNER]: state(entries) });
  let clock = Date.parse(NOW);
  const currentTime = () => new Date(clock);
  const failedDays: string[] = [];
  const failed = await runJournalEditing({
    repository,
    journalId: OWNER,
    now: currentTime,
    generate: async (input) => {
      failedDays.push(input.day);
      throw new Error("Synthetic transient provider failure.");
    },
  });
  assert.equal(failed.failed, 8);
  assert.equal(failed.remaining, 16);
  assert.deepEqual(
    failedDays,
    entries.slice(0, 8).map((value) => value.day),
  );
  const failures = (await repository.readState(OWNER)).journalEditing!
    .failures!;
  assert.equal(failures.length, 8);
  for (const failure of failures) {
    assert.equal(failure.attempts, 1);
    assert.equal(failure.retryAfter, "2026-11-16T12:00:00.000Z");
    assert.deepEqual(Object.keys(failure).sort(), [
      "attempts",
      "day",
      "period",
      "retryAfter",
      "sourceHash",
    ]);
  }
  clock += 24 * 60 * 60_000;
  const nextDays: string[] = [];
  const next = await runJournalEditing({
    repository,
    journalId: OWNER,
    now: currentTime,
    generate: async (input) => {
      nextDays.push(input.day);
      return polished(input);
    },
  });
  assert.equal(next.reviewed, 8);
  assert.equal(
    next.remaining,
    8,
    "deferred notes remain visible in the pending count",
  );
  assert.deepEqual(
    nextDays,
    entries.slice(8).map((value) => value.day),
  );
  assert.equal(
    (await repository.readState(OWNER)).journalEditing!.failures!.length,
    8,
  );
  clock += 24 * 60 * 60_000;
  const retryDays: string[] = [];
  const retried = await runJournalEditing({
    repository,
    journalId: OWNER,
    now: currentTime,
    generate: async (input) => {
      retryDays.push(input.day);
      return polished(input);
    },
  });
  assert.deepEqual(retryDays, failedDays);
  assert.equal(retried.reviewed, 8);
  assert.equal(retried.remaining, 0);
  assert.deepEqual(
    (await repository.readState(OWNER)).journalEditing!.failures,
    [],
  );
});

test("failure cooldown doubles to a seven-day ceiling without retaining failed text", async () => {
  const { repository } = memory();
  let clock = Date.parse(NOW);
  const currentTime = () => new Date(clock);
  for (const [index, delayDays] of [2, 4, 7, 7].entries()) {
    const report = await runJournalEditing({
      repository,
      journalId: OWNER,
      now: currentTime,
      generate: async () => {
        throw new Error("Synthetic failed output must stay private.");
      },
    });
    assert.equal(report.failed, 1);
    const saved = await repository.readState(OWNER);
    const failure = saved.journalEditing!.failures![0];
    assert.equal(failure.attempts, index + 1);
    assert.equal(
      Date.parse(failure.retryAfter) - clock,
      delayDays * 24 * 60 * 60_000,
    );
    assert.deepEqual(saved.journalEditing!.revisions, []);
    assert.deepEqual(saved.dailyCheckIns, state().dailyCheckIns);
    assert.doesNotMatch(
      JSON.stringify(saved),
      /Synthetic failed output must stay private/u,
    );
    clock = Date.parse(failure.retryAfter);
  }
});

test("a manual writing change is eligible immediately despite the previous source hash cooldown", async () => {
  const { repository } = memory();
  await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async () => {
      throw new Error("Synthetic failure.");
    },
  });
  let requests = 0;
  const deferredRun = await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      requests++;
      return polished(input);
    },
  });
  assert.equal(requests, 0);
  assert.equal(deferredRun.remaining, 1);
  await repository.mutateState(OWNER, (data) => {
    data.dailyCheckIns![0].note += " A new thought.";
    data.dailyCheckIns![0].updatedAt = "2026-11-14T12:01:00.000Z";
  });
  const report = await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      requests++;
      return polished(input);
    },
  });
  assert.equal(requests, 1);
  assert.equal(report.reviewed, 1);
  assert.deepEqual(
    (await repository.readState(OWNER)).journalEditing!.failures,
    [],
  );
});

test("a repository failure after acquiring a lease still releases that lease in finally", async () => {
  const { repository } = memory();
  const broken: Repository = {
    ...repository,
    readState: async () => {
      throw new Error("synthetic read failure");
    },
  };
  await assert.rejects(
    runJournalEditing({
      repository: broken,
      journalId: OWNER,
      generate: polished,
      now,
    }),
    /synthetic read failure/u,
  );
  const saved = await repository.readState(OWNER);
  assert.equal(saved.journalEditing!.lease, undefined);
  assert.deepEqual(saved.dailyCheckIns, state().dailyCheckIns);
});

test("an expired lease permits takeover and the old worker cannot overwrite or release its replacement", async () => {
  const { repository } = memory();
  const firstStarted = deferred<void>();
  const firstRelease = deferred<void>();
  const secondStarted = deferred<void>();
  const secondRelease = deferred<void>();
  let clock = Date.parse(NOW);
  const currentTime = () => new Date(clock);
  const first = runJournalEditing({
    repository,
    journalId: OWNER,
    now: currentTime,
    generate: async (input) => {
      firstStarted.resolve();
      await firstRelease.promise;
      return polished(input);
    },
  });
  await firstStarted.promise;
  const firstLease = (await repository.readState(OWNER)).journalEditing!.lease!
    .id;
  clock += JOURNAL_EDITING_LEASE_MS + 1;
  const second = runJournalEditing({
    repository,
    journalId: OWNER,
    now: currentTime,
    generate: async (input) => {
      secondStarted.resolve();
      await secondRelease.promise;
      return polished(input);
    },
  });
  await secondStarted.promise;
  const replacement = (await repository.readState(OWNER)).journalEditing!.lease!
    .id;
  assert.notEqual(replacement, firstLease);
  firstRelease.resolve();
  assert.equal((await first).skipped, 1);
  const duringReplacement = await repository.readState(OWNER);
  assert.equal(duringReplacement.journalEditing!.lease!.id, replacement);
  assert.deepEqual(duringReplacement.journalEditing!.revisions, []);
  secondRelease.resolve();
  assert.equal((await second).changed, 1);
  const saved = await repository.readState(OWNER);
  assert.equal(saved.journalEditing!.lease, undefined);
  assert.equal(saved.journalEditing!.revisions.length, 1);
});

test("a medication rename and reassigned old brand cannot commit links generated from stale context", async () => {
  const original = state([
    entry("2026-11-10", { note: "I mentioned Aurora." }),
  ]);
  original.medications = [medication("original-aurora", "Aurora")];
  const { repository } = memory({ [OWNER]: original });
  const started = deferred<void>();
  const release = deferred<void>();
  let providerContext: JournalEnhancementInput | undefined;
  const pending = runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      providerContext = input;
      started.resolve();
      await release.promise;
      return {
        markdown:
          "# Tue, Nov 10 -- A quiet update\n\nI mentioned [Aurora](/medications?medication=original-aurora).",
        summary: "A quiet update",
      };
    },
  });
  await started.promise;
  assert.ok(
    providerContext!.allowedReferences!.some(
      (reference) =>
        reference.href === "/medications?medication=original-aurora",
    ),
  );
  const changed = await repository.mutateState(OWNER, (data) => {
    data.medications[0].name = "Sunrise";
    data.medications.push(medication("new-aurora", "Aurora"));
  });
  release.resolve();
  const report = await pending;
  assert.equal(report.skipped, 1);
  assert.equal(report.reviewed, 0);
  assert.equal(report.failed, 0);
  const saved = await repository.readState(OWNER);
  assert.deepEqual(saved.dailyCheckIns, original.dailyCheckIns);
  assert.deepEqual(saved.medications, changed.medications);
  assert.deepEqual(saved.journalEditing!.revisions, []);
  assert.equal(saved.journalEditing!.failures, undefined);
  assert.equal(saved.journalEditing!.lease, undefined);
});

test("medication color and unmentioned-name changes leave a valid minimized generation context usable", async () => {
  const original = state([
    entry("2026-11-10", { note: "I mentioned Aurora." }),
  ]);
  original.medications = [
    medication("aurora", "Aurora"),
    medication("unused", "Never mentioned"),
  ];
  const { repository } = memory({ [OWNER]: original });
  const started = deferred<void>();
  const release = deferred<void>();
  let providerContext: JournalEnhancementInput | undefined;
  const pending = runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      providerContext = input;
      started.resolve();
      await release.promise;
      return polished(input);
    },
  });
  await started.promise;
  assert.deepEqual(
    providerContext!.medications!.map((value) => value.id),
    ["aurora"],
  );
  const changed = await repository.mutateState(OWNER, (data) => {
    data.medications[0].color = "amber";
    data.medications[1].name = "Still unmentioned";
    data.medications[1].activeIngredient = "Unmentioned Ingredient";
  });
  release.resolve();
  const report = await pending;
  assert.equal(report.reviewed, 1);
  assert.equal(report.changed, 1);
  assert.equal(report.skipped, 0);
  const saved = await repository.readState(OWNER);
  assert.deepEqual(saved.medications, changed.medications);
  assert.equal(saved.journalEditing!.revisions.length, 1);
});

test("scheduled validation rejects invented known medication names while provider context stays minimized", async () => {
  const original = state([entry("2026-11-10", { note: "i felt tired today" })]);
  original.medications = [medication("diazepam", "Diazepam")];
  const { repository } = memory({ [OWNER]: original });
  let providerContext: JournalEnhancementInput | undefined;
  const report = await runJournalEditing({
    repository,
    journalId: OWNER,
    now,
    generate: async (input) => {
      providerContext = input;
      return {
        markdown: `${formatJournalEntryHeading(input.day)} A tired update\n\ni felt tired on Diazepam today`,
        summary: "A tired update",
      };
    },
  });
  assert.deepEqual(providerContext!.medications, []);
  assert.equal(report.failed, 1);
  assert.equal(report.reviewed, 0);
  const saved = await repository.readState(OWNER);
  assert.deepEqual(saved.dailyCheckIns, original.dailyCheckIns);
  assert.deepEqual(saved.journalEditing!.revisions, []);
  assert.doesNotMatch(JSON.stringify(saved.journalEditing), /on Diazepam/u);

  for (const body of ["i didnt sleep well.", "i didn't sleep well."]) {
    const valid = state([entry("2026-11-10", { note: "i didnt sleep well." })]);
    valid.medications = original.medications;
    const fresh = memory({ [OWNER]: valid }).repository;
    const accepted = await runJournalEditing({
      repository: fresh,
      journalId: OWNER,
      now,
      generate: async (input) => ({
        markdown: `${formatJournalEntryHeading(input.day)} A tired update\n\n${body}`,
        summary: "A tired update",
      }),
    });
    assert.equal(accepted.reviewed, 1);
    assert.equal(accepted.failed, 0);
    assert.ok(
      (await fresh.readState(OWNER)).dailyCheckIns![0].note.endsWith(body),
    );
  }
});

test("manual validation rejects an invented unmentioned catalog medication and accepts conservative grammar repair", () => {
  const original = state([entry("2026-11-10", { note: "i felt tired today" })]);
  original.medications = [medication("diazepam", "Diazepam")];
  const data = structuredClone(original);
  const input = {
    day: "2026-11-10",
    period: "evening" as const,
    expectedHash: journalNoteHash(original.dailyCheckIns![0].note),
    expectedUpdatedAt: original.dailyCheckIns![0].updatedAt,
    candidate: {
      body: "i felt tired on Diazepam today",
      summary: "A tired update",
    },
  };
  assert.deepEqual(
    journalEditingContext(data, data.dailyCheckIns![0]).medications,
    [],
  );
  assert.throws(() => saveReviewedJournalEntry(data, input, now()));
  assert.deepEqual(data, original);
  saveReviewedJournalEntry(
    data,
    {
      ...input,
      candidate: { body: "I felt tired today", summary: "A tired update" },
    },
    now(),
  );
  assert.equal(data.journalEditing!.revisions.length, 1);
  assert.ok(data.dailyCheckIns![0].note.endsWith("I felt tired today"));
});

test("manual reviewed saves validate, retain originals and hashes, and replay idempotently", () => {
  const data = state();
  const original = structuredClone(data.dailyCheckIns![0]);
  const input = {
    day: original.day,
    period: "evening" as const,
    expectedHash: journalNoteHash(original.note),
    expectedUpdatedAt: original.updatedAt,
    candidate: { body: original.note, summary: "A quiet little update" },
  };
  saveReviewedJournalEntry(data, input, now());
  const saved = structuredClone(data);
  const revision = data.journalEditing!.revisions[0];
  assert.equal(revision.originalNote, original.note);
  assert.equal(revision.editedNote, data.dailyCheckIns![0].note);
  assert.equal(revision.sourceHash, journalNoteHash(original.note));
  assert.equal(revision.outputHash, journalNoteHash(revision.editedNote));
  assert.equal(revision.policy, JOURNAL_EDITING_POLICY);
  assert.match(
    revision.editedNote,
    /^# Tue, Nov 10 -- A quiet little update\n\n/u,
  );
  assert.deepEqual(
    {
      ...data.dailyCheckIns![0],
      note: original.note,
      updatedAt: original.updatedAt,
    },
    original,
  );
  saveReviewedJournalEntry(data, input, new Date("2026-11-15T12:00:00Z"));
  assert.deepEqual(data, saved);
});

test("manual reviewed saves reject stale hashes, stale timestamps, missing entries and invalid generated content atomically", () => {
  const original = state();
  const record = original.dailyCheckIns![0];
  const input = {
    day: record.day,
    period: "evening" as const,
    expectedHash: journalNoteHash(record.note),
    expectedUpdatedAt: record.updatedAt,
    candidate: { body: record.note, summary: "A quiet little update" },
  };
  for (const changes of [
    { expectedHash: "0".repeat(64) },
    { expectedUpdatedAt: "2026-11-10T20:00:01.000Z" },
    { day: "2026-11-09" },
    { period: "morning" as const },
  ]) {
    const data = structuredClone(original);
    assert.throws(
      () => saveReviewedJournalEntry(data, { ...input, ...changes }, now()),
      JournalEditingConflict,
    );
    assert.deepEqual(data, original);
  }
  const data = structuredClone(original);
  assert.throws(() =>
    saveReviewedJournalEntry(
      data,
      {
        ...input,
        candidate: {
          body: "I took 99 mg of something new.",
          summary: "A quiet update",
        },
      },
      now(),
    ),
  );
  assert.deepEqual(data, original);
});

test("Postgres editing isolates journals, protects concurrent changes, and durably exports restorable originals", async (t) => {
  // Real SQL/CAS behavior in an in-process database; no network or secrets.
  const db = new PGlite();
  t.after(() => db.close());
  const query = async (text: string, params: unknown[] = []) =>
    (await db.query<Record<string, unknown>>(text, params)).rows;
  const repository = createPostgresJournalRepository(query);
  const competingRepository = createPostgresJournalRepository(query);
  await repository.credentialSnapshot();
  await competingRepository.credentialSnapshot();
  const seed = async (journalId: string, data: AppData) => {
    await query(
      `INSERT INTO pill_happens_state (id,data,version,updated_at)
      VALUES ($1,$2::jsonb,0,'2026-11-01T12:00:00Z')
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,version=0,updated_at=EXCLUDED.updated_at`,
      [journalId, JSON.stringify(data)],
    );
  };

  await t.test(
    "one configured journal and both periods are reviewed without changing any other records",
    async () => {
      const original = state([
        entry("2026-11-10", { period: "morning", note: "morning was quiet." }),
        entry("2026-11-10", { period: undefined, note: "evening was quiet." }),
        entry("2026-11-14"),
      ]);
      delete original.dailyCheckIns![1].period;
      original.medications = [
        {
          id: "synthetic-medication",
          name: "Synthetic medication",
          activeIngredient: "Example Salt",
          strengthMg: 2,
          form: "tablet",
          color: "rose",
          archived: false,
          createdAt: NOW,
        },
      ];
      original.intakes = [
        {
          id: "intake-one",
          medicationId: "synthetic-medication",
          medicationName: "Synthetic medication",
          medicationForm: "tablet",
          strengthMg: 2,
          quantity: 1,
          takenAt: "2026-11-10T12:00:00Z",
          createdAt: "2026-11-10T12:00:00Z",
          note: "An unrelated intake.",
        },
      ];
      original.goals = [
        {
          id: "goal-one",
          medicationId: "synthetic-medication",
          dailyLimitMg: 2,
          startsOn: "2026-11-01",
          endsOn: null,
          note: "An unrelated goal.",
          createdAt: NOW,
        },
      ];
      await seed(OWNER, original);
      await seed(
        OTHER,
        state([
          entry("2026-11-09", { note: "Other journal must stay untouched." }),
        ]),
      );
      await seed(
        "personal",
        state([
          entry("2026-11-08", { note: "Legacy journal must stay untouched." }),
        ]),
      );
      const othersBefore = await query(
        "SELECT * FROM pill_happens_state WHERE id <> $1 ORDER BY id",
        [OWNER],
      );
      const report = await runJournalEditing({
        repository,
        journalId: OWNER,
        generate: polished,
        now,
      });
      assert.equal(report.reviewed, 2);
      assert.equal(report.changed, 2);
      const reopened = createPostgresJournalRepository(query);
      const exported = JSON.parse(
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: NOW,
          data: await readJournalState(reopened, OWNER),
        }),
      ) as { data: AppData };
      const saved = exported.data;
      assert.deepEqual(saved.medications, original.medications);
      assert.deepEqual(saved.intakes, original.intakes);
      assert.deepEqual(saved.goals, original.goals);
      assert.deepEqual(saved.dailyCheckIns![2], original.dailyCheckIns![2]);
      assert.equal(saved.journalEditing!.revisions.length, 2);
      assert.deepEqual(
        new Set(
          saved.journalEditing!.revisions.map((revision) => revision.period),
        ),
        new Set(["morning", "evening"]),
      );
      for (const revision of saved.journalEditing!.revisions) {
        const before = original.dailyCheckIns!.find(
          (value) => (value.period ?? "evening") === revision.period,
        )!;
        const after = saved.dailyCheckIns!.find(
          (value) =>
            value.day === revision.day &&
            (value.period ?? "evening") === revision.period,
        )!;
        assert.equal(revision.originalNote, before.note);
        assert.equal(revision.editedNote, after.note);
        assert.equal(revision.sourceHash, journalNoteHash(before.note));
        assert.equal(revision.outputHash, journalNoteHash(after.note));
        assert.equal(revision.sourceUpdatedAt, before.updatedAt);
        assert.equal(revision.appliedUpdatedAt, after.updatedAt);
        assert.equal(revision.reviewedAt, NOW);
        assert.equal(revision.policy, JOURNAL_EDITING_POLICY);
        assert.deepEqual(
          { ...after, note: before.note, updatedAt: before.updatedAt },
          before,
        );
      }
      assert.deepEqual(
        await query(
          "SELECT * FROM pill_happens_state WHERE id <> $1 ORDER BY id",
          [OWNER],
        ),
        othersBefore,
      );
    },
  );

  await t.test(
    "an overlapping worker cannot make a second paid request",
    async () => {
      await seed(OWNER, state());
      const started = deferred<void>();
      const release = deferred<void>();
      let requests = 0;
      const first = runJournalEditing({
        repository,
        journalId: OWNER,
        now,
        generate: async (input) => {
          requests++;
          started.resolve();
          await release.promise;
          return polished(input);
        },
      });
      await started.promise;
      const second = await runJournalEditing({
        repository: competingRepository,
        journalId: OWNER,
        now,
        generate: async (input) => {
          requests++;
          return polished(input);
        },
      });
      assert.equal(second.busy, true);
      assert.equal(requests, 1);
      release.resolve();
      assert.equal((await first).changed, 1);
      assert.equal(
        (await repository.readState(OWNER)).journalEditing!.lease,
        undefined,
      );
    },
  );

  for (const kind of ["note", "mood"] as const)
    await t.test(
      `a concurrent ${kind} edit wins over stale provider output`,
      async () => {
        await seed(OWNER, state());
        const started = deferred<void>();
        const release = deferred<void>();
        const pending = runJournalEditing({
          repository,
          journalId: OWNER,
          now,
          generate: async (input) => {
            started.resolve();
            await release.promise;
            return polished(input);
          },
        });
        await started.promise;
        const manual = await competingRepository.mutateState(OWNER, (data) => {
          if (kind === "note")
            data.dailyCheckIns![0].note = "My newer writing must win.";
          data.dailyCheckIns![0].moods = ["hopeful"];
          data.dailyCheckIns![0].updatedAt = "2026-11-14T12:00:01.000Z";
        });
        release.resolve();
        const report = await pending;
        assert.equal(report.skipped, 1);
        assert.equal(report.reviewed, 0);
        const saved = await repository.readState(OWNER);
        assert.deepEqual(saved.dailyCheckIns, manual.dailyCheckIns);
        assert.deepEqual(saved.journalEditing!.revisions, []);
        assert.equal(saved.journalEditing!.lease, undefined);
      },
    );

  await t.test(
    "unrelated changes made during generation survive the note CAS",
    async () => {
      await seed(
        OWNER,
        state([
          entry(),
          entry("2026-11-11", { period: "morning", note: "Another period." }),
        ]),
      );
      const started = deferred<void>();
      const release = deferred<void>();
      const pending = runJournalEditing({
        repository,
        journalId: OWNER,
        now,
        limit: 1,
        generate: async (input) => {
          started.resolve();
          await release.promise;
          return polished(input);
        },
      });
      await started.promise;
      await competingRepository.mutateState(OWNER, (data) => {
        data.dailyCheckIns![1].note = "A newer thought in a different period.";
        data.dailyCheckIns![1].updatedAt = NOW;
        data.onboarding = { guidePending: false };
      });
      release.resolve();
      assert.equal((await pending).changed, 1);
      const saved = await repository.readState(OWNER);
      assert.equal(
        saved.dailyCheckIns![1].note,
        "A newer thought in a different period.",
      );
      assert.deepEqual(saved.onboarding, { guidePending: false });
      assert.equal(saved.journalEditing!.revisions.length, 1);
    },
  );

  await t.test(
    "a timezone change during generation invalidates the old calendar context",
    async () => {
      await seed(OWNER, state());
      const started = deferred<void>();
      const release = deferred<void>();
      const pending = runJournalEditing({
        repository,
        journalId: OWNER,
        now,
        generate: async (input) => {
          started.resolve();
          await release.promise;
          return polished(input);
        },
      });
      await started.promise;
      await competingRepository.mutateState(OWNER, (data) => {
        data.settings.timezone = "Europe/London";
      });
      release.resolve();
      const report = await pending;
      assert.equal(report.skipped, 1);
      assert.equal(report.reviewed, 0);
      const saved = await repository.readState(OWNER);
      assert.equal(saved.settings.timezone, "Europe/London");
      assert.deepEqual(saved.dailyCheckIns, state().dailyCheckIns);
      assert.deepEqual(saved.journalEditing!.revisions, []);
      assert.equal(saved.journalEditing!.failures, undefined);
    },
  );

  await t.test(
    "restoration changes only writing, rejects stale or repeated restores, and is not immediately re-edited",
    async () => {
      const original = state([
        entry(),
        entry("2026-11-11", { period: "morning", note: "Other writing." }),
      ]);
      await seed(OWNER, original);
      await runJournalEditing({
        repository,
        journalId: OWNER,
        now,
        limit: 1,
        generate: polished,
      });
      const reviewed = await repository.readState(OWNER);
      const revisionId = reviewed.journalEditing!.revisions[0].id;
      await competingRepository.mutateState(OWNER, (data) => {
        data.dailyCheckIns![0].moods = ["happy"];
        data.dailyCheckIns![0].helped = "New non-writing information.";
        data.dailyCheckIns![0].updatedAt = "2026-11-15T12:00:00.000Z";
      });
      const restored = await repository.mutateState(OWNER, (data) =>
        restoreJournalEditingRevision(data, revisionId, now()),
      );
      assert.equal(
        restored.dailyCheckIns![0].note,
        original.dailyCheckIns![0].note,
      );
      assert.deepEqual(restored.dailyCheckIns![0].moods, ["happy"]);
      assert.equal(
        restored.dailyCheckIns![0].helped,
        "New non-writing information.",
      );
      assert.equal(
        restored.dailyCheckIns![0].updatedAt,
        "2026-11-15T12:00:00.001Z",
      );
      assert.equal(restored.journalEditing!.revisions[0].restoredAt, NOW);
      assert.deepEqual(restored.dailyCheckIns![1], original.dailyCheckIns![1]);
      await assert.rejects(
        repository.mutateState(OWNER, (data) =>
          restoreJournalEditingRevision(data, revisionId, now()),
        ),
        JournalEditingConflict,
      );
      assert.deepEqual(await repository.readState(OWNER), restored);
      const requested: string[] = [];
      await runJournalEditing({
        repository,
        journalId: OWNER,
        now,
        generate: async (input) => {
          requested.push(input.day);
          return polished(input);
        },
      });
      assert.deepEqual(requested, ["2026-11-11"]);

      await seed(OWNER, reviewed);
      const manuallyChanged = await repository.mutateState(OWNER, (data) => {
        data.dailyCheckIns![0].note = "New manual writing.";
      });
      await assert.rejects(
        repository.mutateState(OWNER, (data) =>
          restoreJournalEditingRevision(data, revisionId, now()),
        ),
        JournalEditingConflict,
      );
      assert.deepEqual(await repository.readState(OWNER), manuallyChanged);
      const deleted = await repository.mutateState(OWNER, (data) => {
        data.dailyCheckIns!.shift();
      });
      await assert.rejects(
        repository.mutateState(OWNER, (data) =>
          restoreJournalEditingRevision(data, revisionId, now()),
        ),
        JournalEditingConflict,
      );
      assert.deepEqual(await repository.readState(OWNER), deleted);
    },
  );
});
