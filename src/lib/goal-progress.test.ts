import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, type Goal, type Intake } from "./domain";
import {
  goalDayReadings,
  goalHistory,
  goalStatus,
  goalWindow,
  goalWindowStats,
  medicationGoalTrend,
} from "./goal-progress";

function goal(
  id: string,
  startsOn: string,
  limit: number,
  endsOn: string | null = null,
  medicationId = "a",
): Goal {
  return {
    id,
    medicationId,
    dailyLimitMg: limit,
    startsOn,
    endsOn,
    note: "",
    createdAt: startsOn + "T12:00:00Z",
  };
}
function intake(takenAt: string, mg: number, medicationId = "a"): Intake {
  return {
    id: takenAt + medicationId,
    medicationId,
    medicationName: medicationId,
    strengthMg: mg,
    quantity: 1,
    takenAt,
    createdAt: takenAt,
    note: "",
  };
}

test("recaps and charts use the same tracking day, separate medications and apply the effective checkpoint", () => {
  const old = goal("earlier", "2026-10-01", 5);
  const superseded = goal("x", "2026-10-25", 4);
  const newest = goal("z", "2026-10-25", 3, "2026-10-26");
  const other = goal("b", "2026-10-25", 8, null, "b");
  const data = {
    ...emptyData(),
    goals: [old, newest, other, superseded],
    intakes: [
      intake("2026-10-25T04:59:59Z", 4),
      intake("2026-10-25T05:00:00Z", 1.75),
      intake("2026-10-25T06:00:00Z", 1.25),
      intake("2026-10-26T10:00:00Z", 4),
      intake("2026-10-27T09:00:00Z", 7),
    ],
  };
  const days = goalWindow(data, "a", "2026-10-28", 5);
  assert.deepEqual(
    days.map((d) => [d.totalMg, d.limitMg, d.count]),
    [
      [4, 5, 1],
      [3, 3, 2],
      [4, 3, 1],
      [7, null, 1],
      [null, null, 0],
    ],
  );
  assert.deepEqual(
    goalDayReadings(data, "2026-10-25").map((r) => [
      r.goal.id,
      r.totalMg,
      r.status,
    ]),
    [
      ["z", 3, "at"],
      ["b", null, "unlogged"],
    ],
  );
  assert.deepEqual(
    goalDayReadings(data, "2026-10-27").map((r) => r.goal.id),
    ["b"],
  );
  assert.equal(goalHistory([superseded, newest, old])[0].id, newest.id);
  assert.deepEqual(goalWindowStats(days, "2026-10-27"), {
    within: 2,
    assessed: 3,
    recorded: 3,
    averageMg: 11 / 3,
  });
  assert.deepEqual(goalWindowStats(days, "2026-10-29"), {
    within: 2,
    assessed: 3,
    recorded: 4,
    averageMg: 4.5,
  });
});

test("a zero goal, an empty day, and a recorded zero remain distinguishable", () => {
  assert.equal(goalStatus(null, 0), "unlogged");
  assert.equal(goalStatus(0, 0), "at");
  assert.equal(goalStatus(0.1, 0), "above");
  assert.equal(goalStatus(0.1, 0.2), "within");
  assert.deepEqual(
    goalWindowStats(
      [{ day: "2026-11-03", totalMg: null, limitMg: 0, count: 0 }],
      "2026-11-04",
    ),
    { within: 0, assessed: 0, recorded: 0, averageMg: null },
  );
});

test("the longer comparison uses equally sized, disjoint samples of completed goal days", () => {
  const data = {
    ...emptyData(),
    goals: [goal("open", "2026-11-02", 6)],
    intakes: Array.from({ length: 9 }, (_, i) =>
      intake("2026-11-0" + (i + 1) + "T12:00:00Z", 9 - i),
    ),
  };
  const trend = medicationGoalTrend(data, "a", "2026-11-09");
  assert.equal(trend.firstLog, "2026-11-01");
  assert.equal(trend.recorded, 7);
  assert.deepEqual(trend.comparison, {
    count: 3,
    first: { start: "2026-11-02", end: "2026-11-04", average: 7 },
    recent: { start: "2026-11-06", end: "2026-11-08", average: 3 },
  });
  assert.equal(medicationGoalTrend(data, "a", "2026-11-07").comparison, null);
});

test("a chart near the first representable calendar day keeps the available days", () => {
  assert.deepEqual(
    goalWindow(emptyData(), "a", "0000-01-02", 14).map((row) => row.day),
    ["0000-01-01", "0000-01-02"],
  );
});
