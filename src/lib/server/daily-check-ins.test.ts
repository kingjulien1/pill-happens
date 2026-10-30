import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DAILY_MOOD_VALUES, type DailyCheckIn } from "@/lib/daily-check-in";
import { emptyData, shiftDayKey, type AppData } from "@/lib/domain";
import {
  DAILY_CHECK_IN_LIMIT,
  DailyCheckInSaveError,
  upsertDailyCheckIn,
} from "./daily-check-ins";
import {
  createPostgresJournalRepository,
  type JournalRepository,
} from "./journal-repository";
import { createLocalJournalRepository } from "./local-journal-repository";
import { createJournalService } from "./journal-service";
import { mutateJournalState, readJournalState } from "./journal-state";
import { dailyCheckInSchema } from "./validation";

const now = new Date("2026-10-30T21:00:00.000Z");
const input = (fields: Record<string, unknown> = {}) =>
  dailyCheckInSchema.parse({
    day: "2026-10-30",
    note: "A synthetic daily reflection.",
    ...fields,
  });

// Read through a function after mutations: TypeScript otherwise retains the
// deleted-property/empty-array narrowing across the retry-safe mutation call.
const checkIns = (state: AppData) => state.dailyCheckIns ?? [];

test("daily check-ins trim words, default optional fields, and ignore client timestamps", () => {
  assert.deepEqual(
    input({
      note: "  A quiet evening.  ",
      helped: "  A short walk.  ",
      createdAt: "1900-01-01T00:00:00.000Z",
      updatedAt: "2100-01-01T00:00:00.000Z",
      journalId: "another-journal",
    }),
    {
      day: "2026-10-30",
      note: "A quiet evening.",
      helped: "A short walk.",
      moods: [],
      energy: null,
      stress: null,
      sleepHours: null,
    },
  );
});

test("moods are allowlisted, unique, and limited to four selections", () => {
  for (const mood of DAILY_MOOD_VALUES)
    assert.deepEqual(input({ moods: [mood] }).moods, [mood]);
  assert.equal(input({ moods: DAILY_MOOD_VALUES.slice(0, 4) }).moods.length, 4);
  for (const moods of [
    ["unknown"],
    ["calm", "calm"],
    DAILY_MOOD_VALUES.slice(0, 5),
    "calm",
    [null],
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", moods }).success,
      false,
    );
});

test("check-in text has bounded lengths after trimming and uses real calendar dates", () => {
  assert.equal(input({ note: "x".repeat(800) }).note.length, 800);
  assert.equal(input({ helped: "x".repeat(160) }).helped.length, 160);
  for (const fields of [
    { note: "x".repeat(801) },
    { helped: "x".repeat(161) },
    { day: "2026-02-29" },
    { day: "2026-13-01" },
    { day: "2026-10-30T12:00:00Z" },
    { note: 123 },
    { helped: ["words"] },
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", ...fields }).success,
      false,
    );
  assert.equal(input({ day: "2028-02-29" }).day, "2028-02-29");
});

test("energy and stress are optional whole 1–5 scores while sleep permits zero and fractions", () => {
  for (const name of ["energy", "stress"])
    for (const value of [null, 1, 2, 3, 4, 5])
      assert.equal(
        input({ [name]: value })[name as "energy" | "stress"],
        value,
      );
  for (const name of ["energy", "stress"])
    for (const value of [0, 6, 1.5, NaN, Infinity, "3", true])
      assert.equal(
        dailyCheckInSchema.safeParse({ day: "2026-10-30", [name]: value })
          .success,
        false,
      );
  for (const sleepHours of [null, 0, 0.5, 7.25, 24])
    assert.equal(input({ sleepHours }).sleepHours, sleepHours);
  for (const sleepHours of [-0.1, 24.1, NaN, Infinity, "8", false])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", sleepHours }).success,
      false,
    );
});

test("an empty check-in is rejected but any single meaningful optional detail can be saved", () => {
  for (const fields of [
    {},
    { note: "  ", helped: "\n" },
    { moods: [], energy: null, stress: null, sleepHours: null },
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", ...fields }).success,
      false,
    );
  for (const fields of [
    { note: "A few words." },
    { helped: "Fresh air." },
    { moods: ["okay"] },
    { energy: 1 },
    { stress: 1 },
    { sleepHours: 0 },
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", ...fields }).success,
      true,
    );
});

test("saving a legacy journal adds one check-in with server timing and a copied mood selection", () => {
  const state = emptyData();
  delete state.dailyCheckIns;
  const fields = input({ moods: ["okay", "hopeful"] });
  upsertDailyCheckIn(state, fields, now);
  assert.deepEqual(checkIns(state), [
    { ...fields, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  ]);
  fields.moods.length = 0;
  assert.deepEqual(checkIns(state)[0].moods, ["okay", "hopeful"]);
});

test("editing replaces the tracking day's record, keeps creation time, and leaves other days intact", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input({ day: "2026-10-29" }), now);
  const other = structuredClone(state.dailyCheckIns![0]);
  upsertDailyCheckIn(state, input({ moods: ["tired"], energy: 2 }), now);
  const updated = new Date("2026-10-31T01:00:00.000Z");
  upsertDailyCheckIn(state, input({ note: "Corrected.", stress: 3 }), updated);
  assert.equal(state.dailyCheckIns!.length, 2);
  assert.deepEqual(state.dailyCheckIns![0], other);
  assert.deepEqual(state.dailyCheckIns![1], {
    ...input({ note: "Corrected.", stress: 3 }),
    createdAt: now.toISOString(),
    updatedAt: updated.toISOString(),
  });
});

test("future-day rejection follows the journal timezone and 06:00 boundary, not UTC midnight", () => {
  const state = emptyData();
  assert.throws(
    () =>
      upsertDailyCheckIn(
        state,
        input({ day: "2026-10-31" }),
        new Date("2026-10-31T04:59:59.999Z"),
      ),
    DailyCheckInSaveError,
  );
  assert.deepEqual(checkIns(state), []);
  upsertDailyCheckIn(
    state,
    input({ day: "2026-10-31" }),
    new Date("2026-10-31T05:00:00.000Z"),
  );
  assert.equal(checkIns(state)[0].day, "2026-10-31");
  state.settings.timezone = "Pacific/Kiritimati";
  upsertDailyCheckIn(
    state,
    input({ day: "2026-11-01" }),
    new Date("2026-10-31T18:00:00.000Z"),
  );
  assert.equal(checkIns(state)[1].day, "2026-11-01");
});

test("the check-in limit blocks new days while allowing corrections to existing records", () => {
  const state = emptyData();
  const record: DailyCheckIn = {
    ...input(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  state.dailyCheckIns = Array.from(
    { length: DAILY_CHECK_IN_LIMIT },
    (_, i) => ({
      ...record,
      day: shiftDayKey("1800-01-01", i),
    }),
  );
  assert.throws(
    () => upsertDailyCheckIn(state, input(), now),
    DailyCheckInSaveError,
  );
  assert.equal(state.dailyCheckIns.length, DAILY_CHECK_IN_LIMIT);
  upsertDailyCheckIn(
    state,
    input({ day: "1800-01-01", note: "Corrected." }),
    now,
  );
  assert.equal(state.dailyCheckIns.length, DAILY_CHECK_IN_LIMIT);
  assert.equal(state.dailyCheckIns.at(-1)!.note, "Corrected.");
});

type RepositoryFixture = {
  repository: JournalRepository;
  reopen: () => JournalRepository;
};

const repositories: {
  name: string;
  create: (t: TestContext) => Promise<RepositoryFixture>;
}[] = [
  {
    name: "local JSON",
    async create(t) {
      const directory = await mkdtemp(
        path.join(os.tmpdir(), "pill-happens-check-in-test-"),
      );
      t.after(() => rm(directory, { recursive: true, force: true }));
      const reopen = () => createLocalJournalRepository(directory);
      return { repository: reopen(), reopen };
    },
  },
  {
    name: "Postgres JSONB",
    async create(t) {
      // Embedded Postgres only: no database URL, network, or app credentials.
      const db = new PGlite();
      t.after(() => db.close());
      const reopen = () =>
        createPostgresJournalRepository(
          async (sql, params = []) =>
            (await db.query<Record<string, unknown>>(sql, params)).rows,
        );
      return { repository: reopen(), reopen };
    },
  },
];

for (const fixture of repositories) {
  test(`${fixture.name} persists check-ins across reopening, edits and exports without crossing journals`, async (t) => {
    const { repository, reopen } = await fixture.create(t);
    const otherJournal = await createJournalService(
      repository,
      "synthetic-check-in-owner",
    ).create("synthetic-other-check-in-journal");
    const original: AppData = {
      ...emptyData(),
      intakes: [
        {
          id: "synthetic-intake",
          medicationId: "synthetic-missing-medication",
          medicationName: "Existing intake",
          strengthMg: 2,
          quantity: 0.5,
          takenAt: "2026-10-30T10:00:00.000Z",
          createdAt: "2026-10-30T10:01:00.000Z",
          note: "Preserve this exact entry.",
        },
      ],
    };
    delete original.dailyCheckIns;
    await repository.mutateState("personal", (state) => {
      Object.assign(state, original);
      delete state.dailyCheckIns;
    });
    const untouched = await repository.readState(otherJournal);
    const fields = input({
      moods: ["calm", "tired"],
      energy: 2,
      stress: 3,
      sleepHours: 7.5,
      helped: "A synthetic walk.",
    });
    await mutateJournalState(repository, "personal", (state) => {
      upsertDailyCheckIn(state, fields, now);
    });
    const saved = await readJournalState(reopen(), "personal");
    assert.deepEqual(saved.intakes, original.intakes);
    assert.deepEqual(saved.dailyCheckIns, [
      { ...fields, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ]);
    assert.deepEqual(
      JSON.parse(JSON.stringify({ schemaVersion: 1, data: saved })).data,
      saved,
      "the existing export payload includes reflection data",
    );

    await Promise.all([
      mutateJournalState(repository, "personal", (state) => {
        upsertDailyCheckIn(state, input({ day: "2026-10-28" }), now);
      }),
      mutateJournalState(reopen(), "personal", (state) => {
        upsertDailyCheckIn(state, input({ day: "2026-10-29" }), now);
      }),
    ]);
    const correctedAt = new Date("2026-10-31T01:00:00.000Z");
    await mutateJournalState(reopen(), "personal", (state) => {
      upsertDailyCheckIn(
        state,
        input({ note: "Edited after midnight." }),
        correctedAt,
      );
    });
    const corrected = await readJournalState(reopen(), "personal");
    assert.equal(corrected.dailyCheckIns!.length, 3);
    const entry = corrected.dailyCheckIns!.find(
      (item) => item.day === fields.day,
    )!;
    assert.equal(entry.note, "Edited after midnight.");
    assert.equal(entry.createdAt, now.toISOString());
    assert.equal(entry.updatedAt, correctedAt.toISOString());
    assert.deepEqual(corrected.intakes, original.intakes);
    assert.deepEqual(corrected.medications, original.medications);
    assert.deepEqual(corrected.goals, original.goals);
    assert.deepEqual(await readJournalState(reopen(), otherJournal), untouched);

    const beforeRejection = structuredClone(corrected);
    await assert.rejects(
      mutateJournalState(reopen(), "personal", (state) => {
        upsertDailyCheckIn(state, input({ day: "2026-11-01" }), now);
      }),
      DailyCheckInSaveError,
    );
    assert.deepEqual(
      await readJournalState(reopen(), "personal"),
      beforeRejection,
    );
  });
}
