import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, shiftDayKey, type Intake } from "./domain";
import { loggingStreak, streakMilestone } from "./logging-streak";

function entry(takenAt: string, createdAt = takenAt): Intake {
  return {
    id: `${takenAt}:${createdAt}`,
    medicationId: "medication-1",
    medicationName: "Example",
    strengthMg: 1,
    quantity: 1,
    takenAt,
    createdAt,
    note: "",
  };
}

test("an empty journal has no streak and begins with the two-day milestone", () => {
  assert.deepEqual(loggingStreak(emptyData(), "2026-10-26"), {
    current: 0,
    best: 0,
    totalDays: 0,
    loggedToday: false,
    milestone: null,
    nextMilestone: 2,
  });
});

test("multiple entries count once and the 06:00 boundary assigns the tracking day", () => {
  const data = emptyData();
  data.intakes = [
    entry("2026-10-24T12:00:00Z"),
    entry("2026-10-25T04:59:59Z"),
    entry("2026-10-25T05:00:00Z"),
    entry("2026-10-26T04:59:59Z"),
  ];
  assert.deepEqual(loggingStreak(data, "2026-10-26"), {
    current: 2,
    best: 2,
    totalDays: 2,
    loggedToday: false,
    milestone: 2,
    nextMilestone: 3,
  });
  data.intakes.push(entry("2026-10-26T05:00:00Z"));
  assert.deepEqual(loggingStreak(data, "2026-10-26"), {
    current: 3,
    best: 3,
    totalDays: 3,
    loggedToday: true,
    milestone: 3,
    nextMilestone: 4,
  });
});

test("the current streak survives a morning without a new entry but stops after an older gap", () => {
  const data = emptyData();
  data.intakes = [
    entry("2026-10-23T12:00:00Z"),
    entry("2026-10-24T12:00:00Z"),
    entry("2026-10-25T12:00:00Z"),
  ];
  assert.equal(loggingStreak(data, "2026-10-26").current, 3);
  const afterMissedDay = loggingStreak(data, "2026-10-27");
  assert.equal(afterMissedDay.current, 0);
  assert.equal(afterMissedDay.best, 3);
  assert.equal(afterMissedDay.milestone, null);
  assert.equal(afterMissedDay.nextMilestone, 2);
});

test("best streak and total logged days include older runs across gaps", () => {
  const data = emptyData();
  data.intakes = [10, 11, 12, 13, 25, 26].map((day) =>
    entry(`2026-10-${day}T12:00:00Z`),
  );
  assert.deepEqual(loggingStreak(data, "2026-10-26"), {
    current: 2,
    best: 4,
    totalDays: 6,
    loggedToday: true,
    milestone: 2,
    nextMilestone: 3,
  });
});

test("cumulative milestones can persist independently when the current streak has ended", () => {
  const data = emptyData();
  data.intakes = [1, 3, 5, 7, 9, 11, 13].map((day) =>
    entry(`2026-10-${String(day).padStart(2, "0")}T12:00:00Z`),
  );
  const result = loggingStreak(data, "2026-10-26");
  assert.equal(result.current, 0);
  assert.equal(result.best, 1);
  assert.equal(result.totalDays, 7);
  assert.equal(result.milestone, null);
  assert.equal(result.nextMilestone, 2);
  assert.deepEqual(streakMilestone(result.totalDays), { reached: 7, next: 10 });
});

test("spring daylight saving counts adjacent calendar days despite 23 elapsed hours", () => {
  const data = emptyData();
  data.intakes = [
    entry("2026-03-28T05:00:00Z"),
    entry("2026-03-29T03:59:59Z"),
    entry("2026-03-29T04:00:00Z"),
    entry("2026-03-30T04:00:00Z"),
  ];
  const result = loggingStreak(data, "2026-03-30");
  assert.equal(result.current, 3);
  assert.equal(result.totalDays, 3);
});

test("the repeated autumn hour stays on its prior tracking day without double counting", () => {
  const data = emptyData();
  data.intakes = [
    entry("2026-10-24T12:00:00Z"),
    entry("2026-10-25T00:30:00Z"),
    entry("2026-10-25T01:30:00Z"),
    entry("2026-10-25T05:00:00Z"),
    entry("2026-10-26T05:00:00Z"),
  ];
  const result = loggingStreak(data, "2026-10-26");
  assert.equal(result.current, 3);
  assert.equal(result.best, 3);
  assert.equal(result.totalDays, 3);
});

test("backfilling and deleting entries recomputes streaks from takenAt rather than creation time", () => {
  const data = emptyData();
  data.intakes = [entry("2026-10-23T12:00:00Z"), entry("2026-10-25T12:00:00Z")];
  assert.equal(loggingStreak(data, "2026-10-26").current, 1);
  data.intakes.push(entry("2026-10-24T12:00:00Z", "2026-10-26T12:00:00Z"));
  const snapshot = structuredClone(data);
  assert.equal(loggingStreak(data, "2026-10-26").current, 3);
  assert.deepEqual(
    data,
    snapshot,
    "calculating streaks must not mutate journal entries",
  );
  data.intakes = data.intakes.filter(
    (intake) => !intake.takenAt.startsWith("2026-10-24"),
  );
  assert.equal(loggingStreak(data, "2026-10-26").current, 1);
  assert.equal(loggingStreak(data, "2026-10-26").totalDays, 2);
});

test("future tracking days and malformed timestamps do not create logged days", () => {
  const data = emptyData();
  data.intakes = [
    entry("2026-10-25T12:00:00Z", "2030-01-01T12:00:00Z"),
    entry("2026-10-27T12:00:00Z"),
    entry("2030-01-01T12:00:00Z"),
    entry("not-a-timestamp"),
    entry("2026-02-30T12:00:00Z"),
    entry("2026-10-26T25:00:00Z"),
    entry("2026-10-26"),
  ];
  const result = loggingStreak(data, "2026-10-26");
  assert.equal(result.current, 1);
  assert.equal(result.totalDays, 1);
  assert.equal(result.loggedToday, false);
});

test("the optional current instant excludes later times within today's tracking day", () => {
  const data = emptyData();
  data.intakes = [entry("2026-10-26T13:00:00Z")];
  const now = new Date("2026-10-26T12:00:00Z");
  assert.equal(loggingStreak(data, "2026-10-26").loggedToday, true);
  assert.equal(loggingStreak(data, "2026-10-26", now).loggedToday, false);
  data.intakes.push(entry("2026-10-26T12:00:00Z"));
  const result = loggingStreak(data, "2026-10-26", now);
  assert.equal(result.loggedToday, true);
  assert.equal(result.totalDays, 1);
});

test("streaks use the configured journal timezone rather than the device date", () => {
  const data = emptyData();
  data.settings.timezone = "Asia/Tokyo";
  data.intakes = [entry("2026-10-24T21:00:00Z"), entry("2026-10-25T21:00:00Z")];
  assert.equal(loggingStreak(data, "2026-10-26").current, 2);
  assert.equal(loggingStreak(data, "2026-10-26").loggedToday, true);
});

test("milestones follow every requested early threshold and then continue every five days", () => {
  const cases: [number, number | null, number][] = [
    [0, null, 2],
    [1, null, 2],
    [2, 2, 3],
    [3, 3, 4],
    [4, 4, 5],
    [5, 5, 7],
    [6, 5, 7],
    [7, 7, 10],
    [9, 7, 10],
    [10, 10, 13],
    [12, 10, 13],
    [13, 13, 15],
    [14, 13, 15],
    [15, 15, 17],
    [16, 15, 17],
    [17, 17, 20],
    [19, 17, 20],
    [20, 20, 25],
    [24, 20, 25],
    [25, 25, 30],
    [29, 25, 30],
    [30, 30, 35],
    [34, 30, 35],
    [35, 35, 40],
    [39, 35, 40],
    [40, 40, 45],
    [1_000_003, 1_000_000, 1_000_005],
  ];
  for (const [count, reached, next] of cases) {
    assert.deepEqual(
      streakMilestone(count),
      { reached, next },
      `after ${count} logged days`,
    );
  }
});

test("large streaks have no finite milestone cap", () => {
  const data = emptyData();
  const firstDay = "2024-01-01";
  data.intakes = Array.from({ length: 800 }, (_, index) =>
    entry(`${shiftDayKey(firstDay, index)}T12:00:00Z`),
  );
  const result = loggingStreak(data, shiftDayKey(firstDay, 799));
  assert.deepEqual(result, {
    current: 800,
    best: 800,
    totalDays: 800,
    loggedToday: true,
    milestone: 800,
    nextMilestone: 805,
  });
});
