import { emptyMorningSleep } from "@/lib/morning-sleep";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  DAILY_MOOD_VALUES,
  DAILY_REFLECTION_MAX_LENGTH,
  type DailyCheckIn,
} from "@/lib/daily-check-in";
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
import { saveDailyReflection } from "./daily-reflection";

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

test("morning saves group old and new sound fields, preserve partial readings and recalculate the recorded stages", () => {
  for (const [readings, expected] of [
    [
      { snoringMinutes: 0, coughingRate: 0.4 },
      { snoringMinutes: 0, coughingRate: 0.4 },
    ],
    [{ nightSounds: { coughingRate: 0 } }, { coughingRate: 0 }],
    [
      { snoringMinutes: 5, nightSounds: { snoringMinutes: 0 } },
      { snoringMinutes: 0 },
    ],
  ] as const) {
    const submission = input({
      period: "morning",
      morningSleep: {
        ...readings,
        regularity: 81,
        lightMinutes: 379,
        dreamMinutes: 107,
        totalSleepMinutes: null,
      },
    });
    const state = emptyData();
    upsertDailyCheckIn(state, submission, now);
    const saved = checkIns(state)[0];
    assert.deepEqual(saved.morningSleep?.nightSounds, expected);
    assert.equal(saved.morningSleep?.snoringMinutes, undefined);
    assert.notEqual(
      saved.morningSleep?.nightSounds,
      submission.morningSleep?.nightSounds,
    );
    assert.equal(saved.morningSleep?.totalSleepMinutes, 486);
    assert.equal(saved.sleepHours, 8.1);
  }
  assert.equal(
    input({ period: "morning", morningSleep: { nightSounds: {} } })
      .morningSleep,
    null,
  );
  assert.throws(() =>
    input({
      period: "morning",
      morningSleep: { nightSounds: { coughingRate: -1 } },
    }),
  );
});

test("daily check-ins preserve reflection whitespace, trim short fields, and ignore client timestamps", () => {
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
      period: "evening",
      note: "  A quiet evening.  ",
      helped: "A short walk.",
      moods: [],
      energy: null,
      stress: null,
    },
  );
});

test("check-in periods default old clients to Evening and reject unknown discriminators", () => {
  assert.equal(input().period, "evening");
  assert.equal(input({ period: "morning" }).period, "morning");
  assert.equal(input({ period: "evening" }).period, "evening");
  for (const period of ["Morning", "night", "", null, 1, ["morning"]])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        note: "Words.",
        period,
      }).success,
      false,
    );
});

test("moods accept every distinct registered choice and reject invalid selections", () => {
  for (const mood of DAILY_MOOD_VALUES)
    assert.deepEqual(input({ moods: [mood] }).moods, [mood]);
  assert.deepEqual(
    input({ moods: DAILY_MOOD_VALUES }).moods,
    DAILY_MOOD_VALUES,
  );
  for (const moods of [["unknown"], ["calm", "calm"], "calm", [null]])
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", moods }).success,
      false,
    );
});

test("all registered feelings survive a check-in save and JSON reopening", () => {
  const state = emptyData();
  const fields = input({ moods: [...DAILY_MOOD_VALUES] });
  upsertDailyCheckIn(state, fields, now);
  const reopened: AppData = JSON.parse(JSON.stringify(state));
  assert.deepEqual(checkIns(reopened)[0].moods, DAILY_MOOD_VALUES);
});

test("check-in text has bounded lengths after trimming and uses real calendar dates", () => {
  assert.equal(input({ helped: "x".repeat(800) }).helped.length, 800);
  for (const fields of [
    { helped: "x".repeat(801) },
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

test("reflections accept 100,000 raw characters without changing Markdown indentation or whitespace", () => {
  assert.equal(input({ note: "x".repeat(801) }).note.length, 801);
  const atLimit =
    "    An indented code block.\n\n# A second thought\n\n".padEnd(
      DAILY_REFLECTION_MAX_LENGTH,
      "x",
    );
  assert.equal(atLimit.length, DAILY_REFLECTION_MAX_LENGTH);
  assert.equal(input({ note: atLimit }).note, atLimit);
  const markdown =
    "\n    const memory = 'keep these spaces';\n\nA line with a hard break.  \nAnother line.\n\n";
  assert.equal(input({ note: markdown }).note, markdown);
  const aboveLimit = dailyCheckInSchema.safeParse({
    day: "2026-10-30",
    note: `${atLimit}x`,
  });
  assert.equal(aboveLimit.success, false);
  if (!aboveLimit.success) {
    assert.deepEqual(aboveLimit.error.issues[0].path, ["note"]);
    assert.match(aboveLimit.error.issues[0].message, /100,000/);
  }
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
    {
      ...fields,
      sleepHours: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ]);
  fields.moods.length = 0;
  assert.deepEqual(checkIns(state)[0].moods, ["okay", "hopeful"]);
});

test("full saves accept only valid optional writing versions and never store request metadata", () => {
  for (const expectedUpdatedAt of [undefined, null, now.toISOString()])
    assert.equal(
      input({ expectedUpdatedAt }).expectedUpdatedAt,
      expectedUpdatedAt,
    );
  for (const expectedUpdatedAt of ["", "not-a-date", 123, true, "x".repeat(65)])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        note: "Words",
        expectedUpdatedAt,
      }).success,
      false,
    );
  const state = emptyData();
  upsertDailyCheckIn(state, input({ expectedUpdatedAt: null }), now);
  assert.equal(Object.hasOwn(checkIns(state)[0], "expectedUpdatedAt"), false);
});

test("full forms cannot replace newer writing with stale, null or missing versions", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input(), now);
  const base = checkIns(state)[0].updatedAt;
  const latest = new Date(now.getTime() + 15_000);
  saveDailyReflection(
    state,
    {
      day: "2026-10-30",
      period: "evening",
      note: "Original words.\n\n---\n\nNew paragraphs from the other device.",
      expectedUpdatedAt: base,
    },
    latest,
  );
  const before = structuredClone(state);
  for (const expectedUpdatedAt of [base, null, undefined]) {
    assert.throws(
      () =>
        upsertDailyCheckIn(
          state,
          input({ note: "An older form's words.", expectedUpdatedAt }),
          new Date(latest.getTime() + 1_000),
        ),
      (error) => error instanceof DailyCheckInSaveError && error.status === 409,
    );
    assert.deepEqual(state, before, "a conflict changes no journal fields");
  }
  assert.throws(
    () =>
      upsertDailyCheckIn(
        state,
        dailyCheckInSchema.parse({ day: "2026-10-30", moods: ["calm"] }),
        latest,
      ),
    (error) => error instanceof DailyCheckInSaveError && error.status === 409,
    "a legacy form omitting note cannot clear existing writing",
  );
  assert.deepEqual(state, before);
});

test("own autosave followed by a full save may retain identical writing with an older base", () => {
  for (const expectedUpdatedAt of [null, undefined, now.toISOString()]) {
    const state = emptyData();
    upsertDailyCheckIn(state, input(), now);
    const newer = new Date(now.getTime() + 2_000);
    saveDailyReflection(
      state,
      {
        day: "2026-10-30",
        period: "evening",
        note: "Autosaved writing including the newest paragraph.",
        expectedUpdatedAt: now.toISOString(),
      },
      newer,
    );
    upsertDailyCheckIn(
      state,
      input({
        note: "Autosaved writing including the newest paragraph.",
        moods: ["hopeful"],
        expectedUpdatedAt,
      }),
      new Date(newer.getTime() + 1_000),
    );
    assert.equal(
      checkIns(state)[0].note,
      "Autosaved writing including the newest paragraph.",
    );
    assert.deepEqual(checkIns(state)[0].moods, ["hopeful"]);
  }
});

test("different full saves advance versions even in the same millisecond and cannot revive deleted writing", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input(), now);
  const first = checkIns(state)[0].updatedAt;
  upsertDailyCheckIn(
    state,
    input({ note: "A deliberate correction.", expectedUpdatedAt: first }),
    now,
  );
  assert.equal(
    checkIns(state)[0].updatedAt,
    new Date(now.getTime() + 1).toISOString(),
  );
  assert.throws(
    () =>
      upsertDailyCheckIn(
        state,
        input({ note: "A stale correction.", expectedUpdatedAt: first }),
        now,
      ),
    (error) => error instanceof DailyCheckInSaveError && error.status === 409,
  );
  state.dailyCheckIns = [];
  assert.throws(
    () => upsertDailyCheckIn(state, input({ expectedUpdatedAt: first }), now),
    (error) => error instanceof DailyCheckInSaveError && error.status === 409,
  );
  assert.deepEqual(state.dailyCheckIns, []);
  assert.throws(
    () =>
      upsertDailyCheckIn(
        state,
        input({ note: "", moods: ["calm"], expectedUpdatedAt: first }),
        now,
      ),
    (error) => error instanceof DailyCheckInSaveError && error.status === 409,
    "a stale details-only form must not recreate a deleted record either",
  );
  assert.deepEqual(state.dailyCheckIns, []);
});

test("alternating full and reflection saves never reuse a stale version when clocks match or move backwards", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input(), now);
  const initial = checkIns(state)[0].updatedAt;
  upsertDailyCheckIn(
    state,
    input({ note: "First full edit.", expectedUpdatedAt: initial }),
    now,
  );
  const fullVersion = checkIns(state)[0].updatedAt;
  saveDailyReflection(
    state,
    {
      day: "2026-10-30",
      period: "evening",
      note: "Newest reflection paragraphs.",
      expectedUpdatedAt: fullVersion,
    },
    new Date(now.getTime() - 1_000),
  );
  assert.equal(
    checkIns(state)[0].updatedAt,
    new Date(now.getTime() + 2).toISOString(),
  );
  const before = structuredClone(state);
  for (const expectedUpdatedAt of [initial, fullVersion])
    assert.throws(
      () => upsertDailyCheckIn(state, input({ expectedUpdatedAt }), now),
      (error) => error instanceof DailyCheckInSaveError && error.status === 409,
    );
  assert.deepEqual(state, before);
});

test("editing replaces the tracking day's record, keeps creation time, and leaves other days intact", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input({ day: "2026-10-29" }), now);
  const other = structuredClone(state.dailyCheckIns![0]);
  upsertDailyCheckIn(state, input({ moods: ["tired"], energy: 2 }), now);
  const updated = new Date("2026-10-31T01:00:00.000Z");
  upsertDailyCheckIn(
    state,
    input({
      note: "Corrected.",
      stress: 3,
      expectedUpdatedAt: now.toISOString(),
    }),
    updated,
  );
  assert.equal(state.dailyCheckIns!.length, 2);
  assert.deepEqual(state.dailyCheckIns![0], other);
  assert.deepEqual(state.dailyCheckIns![1], {
    ...input({ note: "Corrected.", stress: 3 }),
    sleepHours: null,
    createdAt: now.toISOString(),
    updatedAt: updated.toISOString(),
  });
});

test("same-day Morning and legacy Evening saves preserve each other's content and original logging times", () => {
  const state = emptyData();
  const legacy: DailyCheckIn = {
    ...input({ note: "The existing Evening." }),
    sleepHours: null,
    createdAt: "2026-10-30T19:45:00.000Z",
    updatedAt: "2026-10-30T20:00:00.000Z",
  };
  delete legacy.period;
  state.dailyCheckIns = [legacy];
  const morningCreatedAt = new Date("2026-10-30T08:00:00.000Z");
  upsertDailyCheckIn(
    state,
    input({ period: "morning", note: "A separate Morning.", energy: 4 }),
    morningCreatedAt,
  );
  assert.equal(checkIns(state).length, 2);
  assert.deepEqual(checkIns(state)[0], legacy);
  const morning = structuredClone(checkIns(state)[1]);
  upsertDailyCheckIn(
    state,
    input({ note: "Edited Evening.", expectedUpdatedAt: legacy.updatedAt }),
    now,
  );
  assert.equal(checkIns(state).length, 2);
  assert.deepEqual(checkIns(state)[0], morning);
  assert.equal(checkIns(state)[1].period, "evening");
  assert.equal(checkIns(state)[1].createdAt, legacy.createdAt);
  const evening = structuredClone(checkIns(state)[1]);
  upsertDailyCheckIn(
    state,
    input({
      period: "morning",
      note: "Edited Morning.",
      expectedUpdatedAt: morning.updatedAt,
    }),
    new Date("2026-10-31T02:00:00.000Z"),
  );
  assert.deepEqual(checkIns(state)[0], evening);
  assert.equal(checkIns(state)[1].createdAt, morningCreatedAt.toISOString());
  assert.equal(checkIns(state)[1].note, "Edited Morning.");
});

test("future-day rejection follows the journal timezone and 06:00 boundary, not UTC midnight", () => {
  const state = emptyData();
  for (const period of ["morning", "evening"])
    assert.throws(
      () =>
        upsertDailyCheckIn(
          state,
          input({ day: "2026-10-31", period }),
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
    sleepHours: null,
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
    input({
      day: "1800-01-01",
      note: "Corrected.",
      expectedUpdatedAt: record.updatedAt,
    }),
    now,
  );
  assert.equal(state.dailyCheckIns.length, DAILY_CHECK_IN_LIMIT);
  assert.equal(state.dailyCheckIns.at(-1)!.note, "Corrected.");
  assert.throws(
    () =>
      upsertDailyCheckIn(
        state,
        input({ day: "1800-01-01", period: "morning" }),
        now,
      ),
    DailyCheckInSaveError,
    "a different period is a new record even on an existing day",
  );
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
  test(`${fixture.name} rejects a stale full form when reflection and full save race`, async (t) => {
    const { repository, reopen } = await fixture.create(t);
    await mutateJournalState(repository, "personal", (state) => {
      upsertDailyCheckIn(state, input(), now);
    });
    const savedAt = new Date(now.getTime() + 10_000);
    const outcomes = await Promise.allSettled([
      mutateJournalState(repository, "personal", (state) => {
        upsertDailyCheckIn(
          state,
          input({
            note: "The full form's deliberate new writing.",
            expectedUpdatedAt: now.toISOString(),
          }),
          savedAt,
        );
      }),
      mutateJournalState(reopen(), "personal", (state) => {
        saveDailyReflection(
          state,
          {
            day: "2026-10-30",
            period: "evening",
            note: "The other device's new paragraphs.",
            expectedUpdatedAt: now.toISOString(),
          },
          savedAt,
        );
      }),
    ]);
    assert.equal(
      outcomes.filter((item) => item.status === "fulfilled").length,
      1,
    );
    const rejected = outcomes.find((item) => item.status === "rejected");
    assert.equal(rejected?.status, "rejected");
    if (rejected?.status === "rejected")
      assert.equal(rejected.reason.status, 409);
    const latest = await readJournalState(reopen(), "personal");
    assert.equal(latest.dailyCheckIns?.length, 1);
    assert.ok(
      [
        "The full form's deliberate new writing.",
        "The other device's new paragraphs.",
      ].includes(latest.dailyCheckIns![0].note),
    );
  });

  test(`${fixture.name} keeps concurrent Morning and Evening saves independent through reopening and export`, async (t) => {
    const { repository, reopen } = await fixture.create(t);
    const morningAt = new Date("2026-10-30T08:00:00.000Z");
    await Promise.all([
      mutateJournalState(repository, "personal", (state) => {
        upsertDailyCheckIn(
          state,
          input({
            period: "morning",
            note: "Morning original.",
            energy: 4,
            morningSleep: {
              ...emptyMorningSleep(),
              dreamRecall: 7,
              lightsOut: "23:00",
              gotUp: "07:00",
              totalSleepMinutes: 420,
              extraSleepMinutes: 0,
            },
          }),
          morningAt,
        );
      }),
      mutateJournalState(reopen(), "personal", (state) => {
        upsertDailyCheckIn(
          state,
          input({
            period: "evening",
            note: "Evening original.",
            stress: 2,
            bedtime: "00:00",
          }),
          now,
        );
      }),
    ]);
    const saved = await readJournalState(reopen(), "personal");
    assert.equal(saved.dailyCheckIns!.length, 2);
    assert.equal(
      saved.dailyCheckIns!.find((entry) => entry.period === "morning")!
        .createdAt,
      morningAt.toISOString(),
    );
    assert.equal(
      saved.dailyCheckIns!.find((entry) => entry.period === "evening")!
        .createdAt,
      now.toISOString(),
    );
    const editedAt = new Date("2026-10-31T01:00:00.000Z");
    await Promise.all([
      mutateJournalState(repository, "personal", (state) => {
        upsertDailyCheckIn(
          state,
          input({
            period: "morning",
            note: "Morning edited.",
            expectedUpdatedAt: morningAt.toISOString(),
          }),
          editedAt,
        );
      }),
      mutateJournalState(reopen(), "personal", (state) => {
        // The legacy period omission still targets Evening with an explicit base.
        upsertDailyCheckIn(
          state,
          input({
            note: "Evening edited.",
            expectedUpdatedAt: now.toISOString(),
          }),
          editedAt,
        );
      }),
    ]);
    const edited = await readJournalState(reopen(), "personal");
    assert.equal(edited.dailyCheckIns!.length, 2);
    const morning = edited.dailyCheckIns!.find(
      (entry) => entry.period === "morning",
    )!;
    const evening = edited.dailyCheckIns!.find(
      (entry) => entry.period === "evening",
    )!;
    assert.deepEqual(
      morning.morningSleep,
      {
        ...emptyMorningSleep(),
        dreamRecall: 7,
        lightsOut: "23:00",
        gotUp: "07:00",
        totalSleepMinutes: 420,
        extraSleepMinutes: 0,
      },
      "old-client edits preserve nested sleep through opaque JSON storage and export",
    );
    assert.equal(morning.note, "Morning edited.");
    assert.equal(evening.note, "Evening edited.");
    assert.equal(
      evening.bedtime,
      "00:00",
      "an old-client update preserves midnight bedtime through reopening",
    );
    assert.equal(morning.createdAt, morningAt.toISOString());
    assert.equal(evening.createdAt, now.toISOString());
    assert.equal(morning.updatedAt, editedAt.toISOString());
    assert.equal(evening.updatedAt, editedAt.toISOString());
    assert.deepEqual(
      JSON.parse(JSON.stringify({ schemaVersion: 1, data: edited })).data
        .dailyCheckIns,
      edited.dailyCheckIns,
      "both period discriminators and response bodies survive the existing backup format",
    );
  });

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
    const longReflection = Array.from(
      { length: 40 },
      (_, index) =>
        `Paragraph ${index + 1}: A synthetic account of the day, with room to describe what happened and how the evening felt.\n  A separate indented thought.`,
    ).join("\n\n");
    assert.ok(longReflection.length > 800);
    const fields = input({
      note: longReflection,
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
    const correctedReflection =
      `${longReflection}\n\nEdited after midnight.`.padEnd(
        DAILY_REFLECTION_MAX_LENGTH,
        "x",
      );
    assert.equal(correctedReflection.length, DAILY_REFLECTION_MAX_LENGTH);
    await mutateJournalState(reopen(), "personal", (state) => {
      upsertDailyCheckIn(
        state,
        input({
          note: correctedReflection,
          expectedUpdatedAt: now.toISOString(),
        }),
        correctedAt,
      );
    });
    const corrected = await readJournalState(reopen(), "personal");
    assert.equal(corrected.dailyCheckIns!.length, 3);
    const entry = corrected.dailyCheckIns!.find(
      (item) => item.day === fields.day,
    )!;
    assert.equal(entry.note, correctedReflection);
    assert.equal(entry.createdAt, now.toISOString());
    assert.equal(entry.updatedAt, correctedAt.toISOString());
    assert.deepEqual(corrected.intakes, original.intakes);
    assert.deepEqual(corrected.medications, original.medications);
    assert.deepEqual(corrected.goals, original.goals);
    const exported = JSON.parse(
      JSON.stringify({ schemaVersion: 1, data: corrected }),
    );
    assert.equal(
      exported.data.dailyCheckIns.find(
        (item: DailyCheckIn) => item.day === fields.day,
      ).note,
      correctedReflection,
      "multiline journal text survives reopening, editing and exporting without truncation",
    );
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

test("Morning sleep is optional, nullable and confined to Morning without inserting fields into old payloads", () => {
  assert.equal(Object.hasOwn(input(), "morningSleep"), false);
  assert.equal(
    Object.hasOwn(input({ period: "morning" }), "morningSleep"),
    false,
  );
  assert.equal(
    Object.hasOwn(input({ morningSleep: undefined }), "morningSleep"),
    false,
  );
  assert.equal(
    input({ period: "morning", morningSleep: null }).morningSleep,
    null,
  );
  for (const fields of [
    { morningSleep: null },
    { morningSleep: {} },
    { period: "evening", morningSleep: { sleepQuality: 5 } },
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        note: "Words.",
        ...fields,
      }).success,
      false,
    );
  assert.deepEqual(
    input({ period: "morning", morningSleep: { dreamRecall: 1 } }).morningSleep,
    { ...emptyMorningSleep(), dreamRecall: 1 },
  );
  assert.equal(
    dailyCheckInSchema.safeParse({
      day: "2026-10-30",
      period: "morning",
      morningSleep: { diagnosis: "invented" },
      note: "Words.",
    }).success,
    false,
  );
});

test("Evening bedtime accepts exact clocks including midnight, remains absent for old clients and saves alone", () => {
  assert.equal(Object.hasOwn(input(), "bedtime"), false);
  assert.equal(Object.hasOwn(input({ bedtime: undefined }), "bedtime"), false);
  assert.equal(input({ bedtime: null }).bedtime, null);
  for (const bedtime of ["00:00", "12:30", "23:30", "23:59"])
    assert.equal(
      dailyCheckInSchema.parse({ day: "2026-10-30", bedtime }).bedtime,
      bedtime,
      "a bedtime-only Evening is meaningful without inventing other answers",
    );
  const blank = dailyCheckInSchema.safeParse({
    day: "2026-10-30",
    bedtime: null,
  });
  assert.equal(blank.success, false);
  for (const bedtime of [
    "24:00",
    "7:00",
    "23:60",
    "23:30:00",
    " 23:30 ",
    "23:",
    "",
    2330,
    true,
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        note: "Words.",
        bedtime,
      }).success,
      false,
    );
  const morning = dailyCheckInSchema.safeParse({
    day: "2026-10-30",
    period: "morning",
    note: "Morning words.",
    bedtime: "23:30",
  });
  assert.equal(morning.success, false);
  if (!morning.success)
    assert.deepEqual(morning.error.issues[0].path, ["bedtime"]);
  assert.equal(
    Object.hasOwn(input({ period: "morning", bedtime: null }), "bedtime"),
    false,
    "harmless null does not manufacture a Morning bedtime field",
  );
});

test("old-client Evening saves preserve bedtime, explicit clocks replace it and null clears it without touching Morning", () => {
  const state = emptyData();
  upsertDailyCheckIn(
    state,
    input({ period: "morning", morningSleep: { gotUp: "12:30" } }),
    now,
  );
  const morning = structuredClone(checkIns(state)[0]);
  upsertDailyCheckIn(state, input({ bedtime: "23:30" }), now);
  const original = checkIns(state).find((entry) => entry.period === "evening")!;
  const later = new Date("2026-10-31T01:00:00.000Z");
  const legacy = input();
  const before = structuredClone(legacy);
  upsertDailyCheckIn(state, legacy, later);
  assert.deepEqual(legacy, before);
  let saved = checkIns(state).find((entry) => entry.period === "evening")!;
  assert.equal(saved.bedtime, "23:30");
  assert.equal(saved.createdAt, original.createdAt);
  assert.equal(saved.updatedAt, later.toISOString());
  upsertDailyCheckIn(state, input({ bedtime: "00:00" }), later);
  saved = checkIns(state).find((entry) => entry.period === "evening")!;
  assert.equal(saved.bedtime, "00:00");
  upsertDailyCheckIn(state, input({ bedtime: null }), later);
  upsertDailyCheckIn(state, legacy, later);
  saved = checkIns(state).find((entry) => entry.period === "evening")!;
  assert.equal(saved.bedtime, null);
  assert.deepEqual(
    checkIns(state).find((entry) => entry.period === "morning"),
    morning,
  );
});

test("Morning ratings use whole 1–10 values while duration/count bounds remain whole, finite and nullable", () => {
  for (const field of [
    "dreamRecall",
    "sleepiness",
    "sleepDepth",
    "restfulness",
    "sleepQuality",
  ])
    for (const value of [0, 11, 1.5, NaN, Infinity, "8", true])
      assert.equal(
        dailyCheckInSchema.safeParse({
          day: "2026-10-30",
          period: "morning",
          note: "Words.",
          morningSleep: { [field]: value },
        }).success,
        false,
        field,
      );
  for (const field of [
    "fallAsleepMinutes",
    "awakeMinutes",
    "totalSleepMinutes",
    "extraSleepMinutes",
  ])
    for (const value of [-1, 1_441, 0.5, NaN, Infinity, "20"])
      assert.equal(
        dailyCheckInSchema.safeParse({
          day: "2026-10-30",
          period: "morning",
          morningSleep: { [field]: value },
        }).success,
        false,
        field,
      );
  for (const value of [-1, 101, 0.5, NaN, "0"])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        period: "morning",
        morningSleep: { awakenings: value },
      }).success,
      false,
    );
  assert.equal(
    input({
      period: "morning",
      morningSleep: {
        sleepQuality: 10,
        extraSleepMinutes: 1_440,
        awakenings: 100,
      },
    }).morningSleep?.sleepQuality,
    10,
  );
});

test("Morning API validates clock estimates and derives legacy sleep hours from canonical total", () => {
  const parsed = input({
    period: "morning",
    sleepHours: 24,
    morningSleep: {
      lightsOut: "23:30",
      gotUp: "07:30",
      totalSleepMinutes: 450,
    },
  });
  assert.equal(parsed.sleepHours, 7.5);
  assert.equal(
    input({
      period: "morning",
      sleepHours: 8,
      morningSleep: { dreamRecall: 5 },
    }).sleepHours,
    null,
  );
  assert.equal(
    input({ period: "morning", sleepHours: 8, morningSleep: null }).sleepHours,
    null,
  );
  for (const time of ["24:00", "7:00", "23:60", "23:30:00", "", " 23:00 "])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        period: "morning",
        note: "Words.",
        morningSleep: { lightsOut: time },
      }).success,
      false,
    );
  const inconsistent = dailyCheckInSchema.safeParse({
    day: "2026-10-30",
    period: "morning",
    morningSleep: { lightsOut: "00:00", gotUp: "01:00", totalSleepMinutes: 61 },
  });
  assert.equal(inconsistent.success, false);
  if (!inconsistent.success) {
    assert.deepEqual(inconsistent.error.issues[0].path, [
      "morningSleep",
      "totalSleepMinutes",
    ]);
    assert.match(inconsistent.error.issues[0].message, /longer than/);
  }
  assert.equal(
    input({
      period: "morning",
      morningSleep: {
        lightsOut: "08:00",
        gotUp: "08:00",
        totalSleepMinutes: 0,
      },
    }).sleepHours,
    0,
  );
});

test("any explicit zero Morning detail can save alone, but unknown details never manufacture a nonempty record", () => {
  for (const field of [
    "fallAsleepMinutes",
    "awakenings",
    "awakeMinutes",
    "totalSleepMinutes",
    "extraSleepMinutes",
  ])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        period: "morning",
        morningSleep: { [field]: 0 },
      }).success,
      true,
      field,
    );
  for (const morningSleep of [undefined, null, {}, emptyMorningSleep()])
    assert.equal(
      dailyCheckInSchema.safeParse({
        day: "2026-10-30",
        period: "morning",
        morningSleep,
      }).success,
      false,
    );
  assert.equal(
    dailyCheckInSchema.safeParse({
      day: "2026-10-30",
      period: "morning",
      sleepHours: 8,
      morningSleep: null,
    }).success,
    false,
    "canonical clear happens before the nonempty check",
  );
});

test("new Morning saves preserve explicitly carried legacy context and old-client saves cannot erase nested sleep", () => {
  const state = emptyData();
  const first = input({
    period: "morning",
    note: "Old Morning.",
    moods: ["calm"],
    energy: 4,
    stress: 2,
    sleepHours: 8,
    helped: "A walk.",
  });
  upsertDailyCheckIn(state, first, now);
  const createdAt = checkIns(state)[0].createdAt;
  const canonical = input({
    ...first,
    morningSleep: {
      ...emptyMorningSleep(),
      sleepDepth: 9,
      totalSleepMinutes: 450,
      awakenings: 0,
    },
  });
  upsertDailyCheckIn(state, canonical, new Date("2026-10-31T01:00:00Z"));
  const saved = checkIns(state)[0];
  assert.deepEqual(saved.moods, ["calm"]);
  assert.equal(saved.energy, 4);
  assert.equal(saved.stress, 2);
  assert.equal(saved.helped, "A walk.");
  assert.equal(saved.sleepHours, 7.5);
  assert.equal(saved.createdAt, createdAt);
  const nested = structuredClone(saved.morningSleep);
  canonical.morningSleep!.sleepDepth = 1;
  assert.equal(
    saved.morningSleep?.sleepDepth,
    9,
    "storage does not alias the caller's object",
  );
  upsertDailyCheckIn(
    state,
    input({ ...first }),
    new Date("2026-10-31T02:00:00Z"),
  );
  assert.deepEqual(checkIns(state)[0].morningSleep, nested);
  assert.equal(
    checkIns(state)[0].sleepHours,
    7.5,
    "retained canonical minutes override an old client's stale root duration",
  );
  upsertDailyCheckIn(
    state,
    input({ period: "morning", note: first.note }),
    now,
  );
  assert.deepEqual(checkIns(state)[0].morningSleep, nested);
  assert.equal(
    checkIns(state)[0].sleepHours,
    7.5,
    "an old client's default null does not erase canonical sleep",
  );
  upsertDailyCheckIn(
    state,
    input({
      period: "morning",
      note: "Explicitly cleared.",
      expectedUpdatedAt: checkIns(state)[0].updatedAt,
      morningSleep: null,
    }),
    now,
  );
  assert.equal(checkIns(state)[0].morningSleep, null);
  assert.equal(checkIns(state)[0].sleepHours, null);
});

test("explicit rating scales permit ten-point answers and preserve mixed legacy fields", () => {
  for (const field of ["energy", "stress"] as const) {
    for (const value of [1, 6, 10])
      assert.equal(
        input({ [field]: value, [`${field}Scale`]: 10 })[field],
        value,
      );
    for (const value of [0, 11, 1.5, NaN, Infinity])
      assert.equal(
        dailyCheckInSchema.safeParse({
          day: "2026-10-30",
          [field]: value,
          [`${field}Scale`]: 10,
        }).success,
        false,
      );
    for (const scale of [0, 7, 11, "10", null])
      assert.equal(
        dailyCheckInSchema.safeParse({
          day: "2026-10-30",
          [field]: 1,
          [`${field}Scale`]: scale,
        }).success,
        false,
      );
    assert.equal(
      dailyCheckInSchema.safeParse({ day: "2026-10-30", [field]: 10 }).success,
      false,
    );
  }
  const state = emptyData();
  upsertDailyCheckIn(state, input({ energy: 3, stress: 5 }), now);
  upsertDailyCheckIn(
    state,
    input({ energy: 3, energyScale: 5, stress: 10, stressScale: 10 }),
    new Date("2026-10-30T21:10:00Z"),
  );
  const saved = checkIns(state)[0];
  assert.equal(saved.energy, 3);
  assert.equal(saved.energyScale, 5);
  assert.equal(saved.stress, 10);
  assert.equal(saved.stressScale, 10);
  upsertDailyCheckIn(
    state,
    input({ energy: 4, stress: 2 }),
    new Date("2026-10-30T21:20:00Z"),
  );
  assert.equal(
    checkIns(state)[0].energyScale,
    undefined,
    "old-client raw values must not inherit a newer scale",
  );
});

test("Evening omission stays distinct from a clear while Morning keeps its duration default", () => {
  assert.equal(Object.hasOwn(input(), "sleepHours"), false);
  assert.equal(
    Object.hasOwn(input({ sleepHours: undefined }), "sleepHours"),
    false,
  );
  assert.equal(input({ period: "morning" }).sleepHours, null);
  assert.equal(input({ sleepHours: null }).sleepHours, null);
  assert.equal(input({ sleepHours: 0 }).sleepHours, 0);
  assert.equal(
    dailyCheckInSchema.safeParse({ day: "2026-10-30", sleepHours: undefined })
      .success,
    false,
    "omitting removed fields cannot manufacture a meaningful new check-in",
  );
});

test("a new Evening without sleep inputs stores a complete null-duration record", () => {
  const state = emptyData();
  const fields = input({ note: "", moods: ["calm"] });
  upsertDailyCheckIn(state, fields, now);
  assert.equal(checkIns(state)[0].sleepHours, null);
  assert.equal(Object.hasOwn(checkIns(state)[0], "bedtime"), false);
  assert.equal(Object.hasOwn(fields, "sleepHours"), false);
});

test("an Evening form that omits hidden sleep fields preserves their current values inside the write", () => {
  const state = emptyData();
  upsertDailyCheckIn(
    state,
    input({ period: "morning", morningSleep: { totalSleepMinutes: 390 } }),
    now,
  );
  const morning = structuredClone(checkIns(state)[0]);
  upsertDailyCheckIn(state, input({ sleepHours: 8, bedtime: "23:00" }), now);
  const preparedForm = input({ moods: ["hopeful"], energy: 4 });
  const before = structuredClone(preparedForm);
  upsertDailyCheckIn(
    state,
    input({ sleepHours: 7.25, bedtime: "00:10" }),
    new Date("2026-10-30T21:05:00Z"),
  );
  upsertDailyCheckIn(state, preparedForm, new Date("2026-10-30T21:06:00Z"));
  const evening = checkIns(state).find((entry) => entry.period === "evening")!;
  assert.equal(evening.sleepHours, 7.25);
  assert.equal(evening.bedtime, "00:10");
  assert.deepEqual(evening.moods, ["hopeful"]);
  assert.equal(evening.energy, 4);
  assert.deepEqual(preparedForm, before, "the writer never mutates its input");
  assert.deepEqual(
    checkIns(state).find((entry) => entry.period === "morning"),
    morning,
  );
});

test("explicit legacy Evening sleep values and null clears remain supported", () => {
  const state = emptyData();
  upsertDailyCheckIn(state, input({ sleepHours: 8, bedtime: "23:00" }), now);
  upsertDailyCheckIn(state, input({ sleepHours: 0, bedtime: "00:00" }), now);
  assert.equal(checkIns(state)[0].sleepHours, 0);
  assert.equal(checkIns(state)[0].bedtime, "00:00");
  upsertDailyCheckIn(state, input({ sleepHours: null, bedtime: null }), now);
  upsertDailyCheckIn(state, input({ moods: ["okay"] }), now);
  assert.equal(checkIns(state)[0].sleepHours, null);
  assert.equal(checkIns(state)[0].bedtime, null);
});

test("omitted Evening sleep does not bypass a changed-writing conflict or alter its latest data", () => {
  const state = emptyData();
  upsertDailyCheckIn(
    state,
    input({ note: "First note.", sleepHours: 7, bedtime: "23:00" }),
    now,
  );
  const stale = input({
    note: "An older editor.",
    expectedUpdatedAt: checkIns(state)[0].updatedAt,
  });
  upsertDailyCheckIn(
    state,
    input({
      note: "Latest writing.",
      expectedUpdatedAt: checkIns(state)[0].updatedAt,
      sleepHours: 6,
      bedtime: "00:30",
    }),
    new Date("2026-10-30T21:05:00Z"),
  );
  const latest = structuredClone(state);
  assert.throws(
    () => upsertDailyCheckIn(state, stale, new Date("2026-10-30T21:06:00Z")),
    (error: unknown) =>
      error instanceof DailyCheckInSaveError && error.status === 409,
  );
  assert.deepEqual(state, latest);
});
