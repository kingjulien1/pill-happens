import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyData,
  shiftDayKey,
  type AppData,
  type Intake,
  type Medication,
} from "./domain";
import type { DailyCheckIn } from "./daily-check-in";
import {
  getMilestoneLook,
  getStreakMilestone,
  getStreakMilestones,
  isStreakMilestoneTarget,
} from "./streak-milestones";

const now = new Date("2026-10-31T12:00:00.000Z");
function intake(day: string, medicationId = "a", quantity = 1): Intake {
  return {
    id: `${day}-${medicationId}-${quantity}`,
    medicationId,
    medicationName: `Saved ${medicationId}`,
    strengthMg: 1,
    quantity,
    takenAt: `${day}T12:00:00.000Z`,
    createdAt: "2026-10-30T12:00:00.000Z",
    note: "",
  };
}
function run(first: string, length: number) {
  return Array.from({ length }, (_, index) =>
    intake(shiftDayKey(first, index)),
  );
}
function medication(id: string, strengthMg = 1): Medication {
  return {
    id,
    name: `Current ${id}`,
    strengthMg,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: "2026-01-01T12:00:00.000Z",
  };
}
function checkIn(
  day: string,
  fields: Partial<DailyCheckIn> = {},
): DailyCheckIn {
  return {
    day,
    note: "",
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    createdAt: "2026-10-30T12:00:00.000Z",
    updatedAt: "2026-10-30T12:00:00.000Z",
    ...fields,
  };
}
function comparisonData() {
  const data = emptyData();
  data.medications = [medication("a")];
  // The gap on the 9th keeps the earlier two-day run separate.
  data.intakes = [...run("2026-10-07", 2), ...run("2026-10-10", 3)];
  return data;
}
function analytics(data: AppData) {
  const detail = getStreakMilestone(data, now, 3);
  assert.ok(detail?.analytics);
  return detail.analytics;
}

test("milestone targets follow every early increment and then safe multiples of five", () => {
  for (const target of [
    2, 3, 4, 5, 7, 10, 13, 15, 17, 20, 25, 30, 35, 40, 800, 1_000_000,
    9_007_199_254_740_990,
  ])
    assert.equal(isStreakMilestoneTarget(target), true, String(target));
  for (const target of [
    -5,
    0,
    1,
    6,
    8,
    12,
    29,
    31,
    34,
    36,
    2.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.equal(isStreakMilestoneTarget(target), false, String(target));
    assert.equal(getStreakMilestone(emptyData(), now, target), null);
  }
});

test("an empty journal starts with only the next three quiet targets", () => {
  const result = getStreakMilestones(emptyData(), now);
  assert.deepEqual(result.achieved, []);
  assert.deepEqual(
    result.upcoming.map((entry) => entry.target),
    [2, 3, 4],
  );
  for (const milestone of result.upcoming) {
    assert.equal(milestone.achieved, false);
    assert.equal(milestone.currentProgress, 0);
    assert.equal(milestone.remaining, milestone.target);
    assert.equal(milestone.achievedOn, null);
    assert.equal(milestone.analytics, null);
  }
});

test("the latest three achievements survive a later gap and upcoming progress follows the current run", () => {
  const data = emptyData();
  data.intakes = [...run("2026-10-01", 6), intake("2026-10-31")];
  const result = getStreakMilestones(data, now);
  assert.equal(result.streak.current, 1);
  assert.equal(result.streak.best, 6);
  assert.deepEqual(
    result.achieved.map((entry) => entry.target),
    [5, 4, 3],
  );
  assert.deepEqual(
    result.upcoming.map((entry) => entry.target),
    [7, 10, 13],
  );
  assert.equal(result.upcoming[0].currentProgress, 1);
  assert.equal(result.upcoming[0].remaining, 6);
  assert.equal(result.achieved[0].achieved, true);
  assert.equal(result.achieved[0].achievedOn, "2026-10-05");
  assert.equal(
    result.achieved.every((entry) => entry.analytics === null),
    true,
    "list cards do not build unused comparison snapshots",
  );
});

test("the five-day sequence returns only three targets on either side of a large personal best", () => {
  const data = emptyData();
  data.intakes = run("2024-01-01", 800);
  const result = getStreakMilestones(data, now);
  assert.deepEqual(
    result.achieved.map((entry) => entry.target),
    [800, 795, 790],
  );
  assert.deepEqual(
    result.upcoming.map((entry) => entry.target),
    [805, 810, 815],
  );
  assert.equal(result.streak.best, 800);
});

test("the first successful run fixes the achievement date regardless of later or backfilled creation times", () => {
  const data = emptyData();
  data.intakes = [...run("2026-10-01", 5), ...run("2026-10-20", 10)].reverse();
  data.intakes[0].createdAt = "2030-01-01T12:00:00.000Z";
  const first = getStreakMilestone(data, now, 5);
  assert.equal(first?.runStart, "2026-10-01");
  assert.equal(first?.achievedOn, "2026-10-05");
  const later = getStreakMilestone(data, now, 7);
  assert.equal(later?.runStart, "2026-10-20");
  assert.equal(later?.windowEnd, "2026-10-26");
});

test("invalid timestamps, future intakes and reflection-only days cannot unlock a milestone", () => {
  const data = emptyData();
  data.intakes = [
    intake("2026-10-30"),
    intake("2026-10-30", "b"),
    intake("2026-11-01"),
    intake("2026-02-30"),
    { ...intake("2026-10-31"), takenAt: "2026-10-31T13:00:00Z" },
    { ...intake("2026-10-29"), takenAt: "not-a-time" },
  ];
  data.dailyCheckIns = [checkIn("2026-10-29", { moods: ["calm"] })];
  const result = getStreakMilestones(data, now);
  assert.equal(result.streak.best, 1);
  assert.equal(result.streak.current, 1);
  assert.equal(result.streak.totalDays, 1);
  assert.equal(result.achieved.length, 0);
});

test("achievement days apply the 06:00 boundary over the autumn clock change", () => {
  const data = emptyData();
  data.intakes = [
    { ...intake("2026-10-24"), takenAt: "2026-10-24T12:00:00Z" },
    { ...intake("2026-10-25"), takenAt: "2026-10-25T04:59:59Z" },
    { ...intake("2026-10-25"), takenAt: "2026-10-25T05:00:00Z" },
    { ...intake("2026-10-26"), takenAt: "2026-10-26T05:00:00Z" },
  ];
  const detail = getStreakMilestone(data, new Date("2026-10-26T12:00:00Z"), 3);
  assert.equal(detail?.runStart, "2026-10-24");
  assert.equal(detail?.achievedOn, "2026-10-26");
  assert.equal(detail?.analytics?.current.loggedDays, 3);
  assert.equal(detail?.analytics?.current.intakeCount, 4);
});

test("the milestone date follows the journal timezone instead of UTC calendar dates", () => {
  const data = emptyData();
  data.settings.timezone = "Asia/Tokyo";
  data.intakes = [
    { ...intake("2026-10-24"), takenAt: "2026-10-24T21:00:00Z" },
    { ...intake("2026-10-25"), takenAt: "2026-10-25T21:00:00Z" },
  ];
  const detail = getStreakMilestone(data, new Date("2026-10-26T12:00:00Z"), 2);
  assert.equal(detail?.runStart, "2026-10-25");
  assert.equal(detail?.achievedOn, "2026-10-26");
});

test("comparisons use equal calendar windows and retain missing-day coverage", () => {
  const result = analytics(comparisonData());
  assert.equal(result.current.start, "2026-10-10");
  assert.equal(result.current.end, "2026-10-12");
  assert.equal(result.previous.start, "2026-10-07");
  assert.equal(result.previous.end, "2026-10-09");
  assert.equal(result.current.dayCount, 3);
  assert.equal(result.previous.dayCount, 3);
  assert.equal(result.current.loggedDays, 3);
  assert.equal(result.previous.loggedDays, 2);
  assert.equal(result.current.intakeCount, 3);
  assert.equal(result.previous.intakeCount, 2);
});

test("only reported energy and stress judge improvement; sleep remains a neutral measurement", () => {
  const data = comparisonData();
  data.dailyCheckIns = [
    checkIn("2026-10-07", { energy: 2, stress: 4, sleepHours: 7 }),
    checkIn("2026-10-08", { energy: 2, stress: 4, sleepHours: 9 }),
    checkIn("2026-10-10", { energy: 4, stress: 2, sleepHours: 8 }),
    checkIn("2026-10-11", { energy: 4, stress: 2, sleepHours: 8 }),
  ];
  const result = analytics(data);
  assert.deepEqual(
    result.ratings.map(({ key, delta, trend }) => ({ key, delta, trend })),
    [
      { key: "energy", delta: 2, trend: "improved" },
      { key: "stress", delta: -2, trend: "improved" },
      { key: "sleepHours", delta: 0, trend: "neutral" },
    ],
  );
  data.dailyCheckIns[2].energy = 1;
  data.dailyCheckIns[3].energy = 1;
  data.dailyCheckIns[2].stress = 4;
  data.dailyCheckIns[3].stress = 4;
  const changed = analytics(data);
  assert.equal(changed.ratings[0].trend, "worse");
  assert.equal(changed.ratings[1].trend, "unchanged");
});

test("a single rating on either side is insufficient and a real zero-hour response is retained", () => {
  const data = comparisonData();
  data.dailyCheckIns = [
    checkIn("2026-10-07", { energy: 2, sleepHours: 0 }),
    checkIn("2026-10-08", { sleepHours: 0 }),
    checkIn("2026-10-10", { energy: 5, sleepHours: 0 }),
    checkIn("2026-10-11", { sleepHours: 0 }),
  ];
  const result = analytics(data);
  assert.equal(result.ratings[0].current, 5);
  assert.equal(result.ratings[0].previous, 2);
  assert.equal(result.ratings[0].delta, null);
  assert.equal(result.ratings[0].trend, "insufficient");
  assert.deepEqual(result.current.sleepHours, { mean: 0, count: 2 });
  assert.equal(result.ratings[2].trend, "neutral");
});

test("missing check-ins remain unknown and invalid/future responses cannot enter comparisons", () => {
  const data = comparisonData();
  const empty = analytics(data);
  assert.deepEqual(empty.current.energy, { mean: null, count: 0 });
  assert.equal(
    empty.ratings.every((rating) => rating.trend === "insufficient"),
    true,
  );
  data.dailyCheckIns = [
    checkIn("2026-10-10", { energy: 5, createdAt: "2030-01-01T12:00:00Z" }),
    checkIn("2026-10-11", { stress: 5, updatedAt: "2030-01-01T12:00:00Z" }),
    checkIn("2026-02-30", { energy: 5 }),
    checkIn("2026-11-01", { energy: 5 }),
  ];
  assert.equal(analytics(data).current.checkInDays, 0);
});

test("duplicate check-ins select the latest actual edit and count moods only once per day", () => {
  const data = comparisonData();
  data.dailyCheckIns = [
    checkIn("2026-10-10", {
      energy: 4,
      moods: ["calm", "calm"],
      updatedAt: "2026-10-30T12:30:00Z",
    }),
    checkIn("2026-10-10", {
      energy: 1,
      moods: ["low"],
      updatedAt: "2026-10-30T14:00:00+02:00",
    }),
  ];
  const result = analytics(data).current;
  assert.equal(result.checkInDays, 1);
  assert.deepEqual(result.energy, { mean: 4, count: 1 });
  assert.deepEqual(
    result.moods.map(({ value, count }) => ({ value, count })),
    [{ value: "calm", count: 1 }],
  );
});

test("medication amounts stay separate, use current strength, and never turn missing records into zero", () => {
  const data = comparisonData();
  data.medications = [
    { ...medication("a", 4), isBenzodiazepine: true, archived: true },
    medication("b", 10),
  ];
  data.intakes = [
    intake("2026-10-07", "a", 2),
    intake("2026-10-08", "a", 2),
    {
      ...intake("2026-10-07", "missing"),
      medicationName: "Fallback",
      strengthMg: 2,
    },
    ...run("2026-10-10", 3),
    intake("2026-10-11", "b"),
  ];
  const result = analytics(data).medications;
  assert.equal(result.length, 3);
  const a = result.find((entry) => entry.medicationId === "a")!;
  assert.equal(a.name, "Current a");
  assert.equal(a.isBenzodiazepine, true);
  assert.equal(a.currentTotalMg, 12);
  assert.equal(a.previousTotalMg, 16);
  assert.equal(a.currentLoggedDays, 3);
  assert.equal(a.previousLoggedDays, 2);
  assert.equal(a.currentMeanMg, 4);
  assert.equal(a.previousMeanMg, 8);
  assert.equal(a.delta, -4);
  assert.equal(a.direction, "lower");
  const b = result.find((entry) => entry.medicationId === "b")!;
  assert.equal(b.currentMeanMg, 10);
  assert.equal(b.previousTotalMg, null);
  assert.equal(b.previousMeanMg, null);
  assert.equal(b.direction, "insufficient");
  const missing = result.find((entry) => entry.medicationId === "missing")!;
  assert.equal(missing.name, "Fallback");
  assert.equal(missing.currentTotalMg, null);
  assert.equal(missing.previousMeanMg, 2);
  assert.equal(
    data.intakes[0].strengthMg,
    1,
    "derived current strength must not mutate the saved intake",
  );
});

test("notes and helpful moments count distinct days and returned snapshots do not mutate source data", () => {
  const data = comparisonData();
  data.intakes[2].note = "Some context.";
  data.dailyCheckIns = [
    checkIn("2026-10-10", { note: "A good chat.", moods: ["hopeful"] }),
    checkIn("2026-10-12", { helped: "A walk." }),
  ];
  const before = structuredClone(data);
  const result = analytics(data);
  assert.equal(result.current.noteDays, 2);
  assert.equal(result.current.checkInDays, 2);
  result.current.checkIns[0].moods.length = 0;
  result.current.checkIns[0].note = "Changed local view.";
  assert.deepEqual(data, before);
});

test("artwork metadata is deterministic, independent and positive without assuming a health outcome", () => {
  const first = getMilestoneLook(7);
  assert.deepEqual(first, getMilestoneLook(7));
  assert.match(first.palette.accent, /^#[0-9a-f]{6}$/);
  first.palette.accent = "#000000";
  assert.notEqual(getMilestoneLook(7).palette.accent, "#000000");
  assert.notEqual(getMilestoneLook(2).emoji, getMilestoneLook(3).emoji);
  assert.equal(typeof getMilestoneLook(0).title, "string");
});

test("a distant valid upcoming target stays cheap and has no invented dates or comparisons", () => {
  const target = 9_007_199_254_740_990;
  const result = getStreakMilestone(emptyData(), now, target);
  assert.ok(result);
  assert.equal(result.achieved, false);
  assert.equal(result.analytics, null);
  assert.equal(result.achievedOn, null);
  assert.equal(result.runStart, null);
  assert.equal(result.remaining, target);
});
