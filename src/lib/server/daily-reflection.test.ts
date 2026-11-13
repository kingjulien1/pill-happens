import assert from "node:assert/strict";
import test from "node:test";
import { emptyData } from "@/lib/domain";
import { emptyMorningSleep } from "@/lib/morning-sleep";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import { dailyCheckInSchema } from "./validation";
import {
  dailyReflectionSchema,
  DailyReflectionSaveError,
  saveDailyReflection,
} from "./daily-reflection";

const now = new Date("2026-11-06T12:00:00.000Z");
const original: DailyCheckIn = {
  day: "2026-11-06",
  period: "morning",
  note: "Before",
  moods: ["calm"],
  energy: 3,
  stress: 2,
  sleepHours: 7,
  helped: "A walk",
  morningSleep: {
    ...emptyMorningSleep(),
    totalSleepMinutes: 420,
    awakenings: 0,
  },
  createdAt: "2026-11-06T08:00:00.000Z",
  updatedAt: "2026-11-06T09:00:00.000Z",
};
const input = (fields: Record<string, unknown> = {}) =>
  dailyReflectionSchema.parse({
    day: original.day,
    period: "morning",
    note: "After",
    expectedUpdatedAt: original.updatedAt,
    ...fields,
  });

test("note-only patch preserves every saved field and the other period", () => {
  const state = emptyData();
  const evening = {
    ...original,
    period: "evening" as const,
    note: "Evening words",
  };
  state.dailyCheckIns = [structuredClone(original), evening];
  saveDailyReflection(
    state,
    input({ energy: 5, morningSleep: null, helped: "Unsaved form" }),
    now,
  );
  assert.deepEqual(state.dailyCheckIns[0], {
    ...original,
    note: "After",
    updatedAt: now.toISOString(),
  });
  assert.deepEqual(state.dailyCheckIns[1], evening);
});

test("stale versions conflict without changes and same-note acknowledgement is idempotent", () => {
  const state = emptyData();
  state.dailyCheckIns = [structuredClone(original)];
  const before = structuredClone(state);
  assert.throws(
    () => saveDailyReflection(state, input({ expectedUpdatedAt: null }), now),
    (error) =>
      error instanceof DailyReflectionSaveError && error.status === 409,
  );
  assert.deepEqual(state, before);
  saveDailyReflection(
    state,
    input({ note: original.note, expectedUpdatedAt: null }),
    now,
  );
  assert.deepEqual(state, before);
});

test("new writing creates a valid reflection-only entry with unknown optional fields", () => {
  for (const period of ["morning", "evening"] as const) {
    const state = emptyData();
    saveDailyReflection(
      state,
      input({ period, expectedUpdatedAt: null, note: "  ## New\n\nWords.  " }),
      now,
    );
    const saved = state.dailyCheckIns?.[0];
    assert.ok(saved);
    assert.equal(saved.note, "  ## New\n\nWords.  ");
    assert.equal(saved.energy, null);
    assert.equal(saved.sleepHours, null);
    assert.equal(saved.morningSleep, undefined);
    assert.deepEqual(saved.moods, []);
    assert.equal(dailyCheckInSchema.safeParse(saved).success, true);
  }
});

test("blank new notes do not create records; clearing sole content removes only that period", () => {
  const state = emptyData();
  saveDailyReflection(
    state,
    input({ note: "\n ", expectedUpdatedAt: null }),
    now,
  );
  assert.equal(state.dailyCheckIns?.length ?? 0, 0);
  const onlyNote = {
    ...original,
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    morningSleep: null,
    helped: "",
  };
  const evening = { ...onlyNote, period: "evening" as const };
  state.dailyCheckIns = [onlyNote, evening];
  saveDailyReflection(state, input({ note: "" }), now);
  assert.deepEqual(state.dailyCheckIns, [evening]);
});

test("zero-valued Morning details survive clearing the note and revisions do not collide", () => {
  const state = emptyData();
  const saved = {
    ...original,
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    morningSleep: { ...emptyMorningSleep(), awakenings: 0 },
    updatedAt: now.toISOString(),
  };
  state.dailyCheckIns = [saved];
  saveDailyReflection(
    state,
    input({ note: "", expectedUpdatedAt: saved.updatedAt }),
    now,
  );
  assert.equal(state.dailyCheckIns.length, 1);
  assert.equal(state.dailyCheckIns[0].morningSleep?.awakenings, 0);
  assert.notEqual(state.dailyCheckIns[0].updatedAt, saved.updatedAt);
});

test("Evening note-only saves and clearing writing preserve a sole midnight bedtime", () => {
  const state = emptyData();
  const evening: DailyCheckIn = {
    ...original,
    period: "evening",
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    morningSleep: undefined,
    helped: "",
    bedtime: "00:00",
  };
  state.dailyCheckIns = [structuredClone(original), evening];
  saveDailyReflection(
    state,
    input({ period: "evening", note: "Revised evening words.", bedtime: null }),
    now,
  );
  const revised = state.dailyCheckIns.find(
    (entry) => entry.period === "evening",
  )!;
  assert.equal(revised.bedtime, "00:00", "note-only API ignores other inputs");
  assert.deepEqual(state.dailyCheckIns[0], original);
  saveDailyReflection(
    state,
    input({
      period: "evening",
      note: "",
      expectedUpdatedAt: revised.updatedAt,
    }),
    new Date(now.getTime() + 1_000),
  );
  const cleared = state.dailyCheckIns.find(
    (entry) => entry.period === "evening",
  )!;
  assert.ok(cleared, "clearing writing never deletes the unrelated bedtime");
  assert.equal(cleared.note, "");
  assert.equal(cleared.bedtime, "00:00");
  assert.equal(dailyCheckInSchema.safeParse(cleared).success, true);
});

test("validation enforces note cap, period/version and future-day protection", () => {
  assert.equal(
    dailyReflectionSchema.safeParse({ ...input(), note: "x".repeat(100_001) })
      .success,
    false,
  );
  assert.equal(
    dailyReflectionSchema.safeParse({ ...input(), period: "night" }).success,
    false,
  );
  assert.equal(
    dailyReflectionSchema.safeParse({
      ...input(),
      expectedUpdatedAt: "not-a-date",
    }).success,
    false,
  );
  assert.throws(
    () =>
      saveDailyReflection(
        emptyData(),
        input({ day: "2026-11-07", expectedUpdatedAt: null }),
        now,
      ),
    (error) =>
      error instanceof DailyReflectionSaveError && error.status === 400,
  );
});
