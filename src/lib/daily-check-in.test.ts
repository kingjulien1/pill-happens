import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "./domain";
import {
  canCheckIn,
  checkInForDay,
  journalDays,
  type DailyCheckIn,
} from "./daily-check-in";

function reflection(day: string): DailyCheckIn {
  return {
    day,
    note: "A gentler evening.",
    moods: ["calm"],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    createdAt: "2026-10-30T21:00:00.000Z",
    updatedAt: "2026-10-30T21:00:00.000Z",
  };
}

test("the current day's prompt opens exactly at 20:30 in the journal timezone", () => {
  const zone = "Europe/Vienna";
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T19:29:59Z"), zone),
    false,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T19:30:00Z"), zone),
    true,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T22:59:59Z"), zone),
    true,
  );
});

test("the evening stays attached to its tracking day until 06:00", () => {
  const zone = "Europe/Vienna";
  const afterMidnight = new Date("2026-10-30T23:15:00Z");
  const beforeReset = new Date("2026-10-31T04:59:59Z");
  const reset = new Date("2026-10-31T05:00:00Z");
  assert.equal(dayKey(afterMidnight, zone), "2026-10-30");
  assert.equal(
    canCheckIn(dayKey(afterMidnight, zone), afterMidnight, zone),
    true,
  );
  assert.equal(canCheckIn(dayKey(beforeReset, zone), beforeReset, zone), true);
  assert.equal(dayKey(reset, zone), "2026-10-31");
  assert.equal(canCheckIn(dayKey(reset, zone), reset, zone), false);
  assert.equal(
    canCheckIn("2026-10-30", reset, zone),
    true,
    "missed reflections remain available in history",
  );
});

test("reflection timing follows the journal zone rather than the device or UTC clock", () => {
  const now = new Date("2026-10-30T11:30:00Z");
  assert.equal(canCheckIn("2026-10-30", now, "Asia/Tokyo"), true);
  assert.equal(canCheckIn("2026-10-30", now, "Europe/Vienna"), false);
  assert.equal(canCheckIn("2026-10-30", now, "America/New_York"), false);
  assert.equal(canCheckIn("2026-10-31", now, "Asia/Tokyo"), false);
});

test("both occurrences of the repeated autumn hour belong to the same evening", () => {
  for (const instant of ["2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]) {
    const now = new Date(instant);
    assert.equal(dayKey(now, "Europe/Vienna"), "2026-10-24");
    assert.equal(canCheckIn("2026-10-24", now, "Europe/Vienna"), true);
  }
  const springReset = new Date("2026-03-29T04:00:00Z");
  assert.equal(
    canCheckIn(
      dayKey(springReset, "Europe/Vienna"),
      springReset,
      "Europe/Vienna",
    ),
    false,
  );
});

test("invalid and future day keys cannot expose a check-in prompt", () => {
  const now = new Date("2026-10-30T21:00:00Z");
  for (const day of [
    "",
    "2026-02-30",
    "2026-10-31",
    "2026-99-01",
    "tomorrow",
  ]) {
    assert.equal(canCheckIn(day, now, "Europe/Vienna"), false);
  }
});

test("legacy journals and lookup keep check-ins scoped to their exact day", () => {
  const saved = reflection("2026-10-29");
  assert.equal(checkInForDay(undefined, "2026-10-29"), undefined);
  assert.equal(checkInForDay([saved], "2026-10-30"), undefined);
  assert.equal(checkInForDay([saved], "2026-10-29"), saved);
});

test("history includes reflection-only days and deduplicates intake days in descending order", () => {
  const intakes = [
    { takenAt: "2026-10-29T22:00:00Z" },
    { takenAt: "2026-10-29T23:30:00Z" },
    { takenAt: "2026-10-28T10:00:00Z" },
  ];
  const checkIns = [reflection("2026-10-29"), reflection("2026-10-27")];
  const before = structuredClone({ intakes, checkIns });
  assert.deepEqual(journalDays(intakes, checkIns, "Europe/Vienna"), [
    "2026-10-29",
    "2026-10-28",
    "2026-10-27",
  ]);
  assert.deepEqual({ intakes, checkIns }, before);
  assert.deepEqual(journalDays([], undefined, "Europe/Vienna"), []);
  assert.deepEqual(
    journalDays([], [reflection("not a day")], "Europe/Vienna"),
    [],
  );
});
