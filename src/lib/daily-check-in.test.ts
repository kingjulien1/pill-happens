import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "./domain";
import {
  canCheckIn,
  checkInForDay,
  getCheckInPeriod,
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

test("the current day's prompt opens exactly at 17:00 in the journal timezone", () => {
  const zone = "Europe/Vienna";
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T15:59:59Z"), zone),
    false,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T16:00:00Z"), zone),
    true,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T22:59:59Z"), zone),
    true,
  );
});

test("the 17:00 evening cutoff follows both winter and summer journal offsets", () => {
  for (const [day, before, ready] of [
    ["2026-11-09", "2026-11-09T15:59:59Z", "2026-11-09T16:00:00Z"],
    ["2026-07-09", "2026-07-09T14:59:59Z", "2026-07-09T15:00:00Z"],
  ]) {
    assert.equal(canCheckIn(day, new Date(before), "Europe/Vienna"), false);
    assert.equal(canCheckIn(day, new Date(ready), "Europe/Vienna"), true);
    assert.equal(
      canCheckIn(day, new Date(before), "Europe/Vienna", "morning"),
      true,
    );
    assert.equal(
      canCheckIn(day, new Date(ready), "Europe/Vienna", "morning"),
      true,
    );
  }
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

test("Morning and Evening lookups remain independent while legacy records stay Evening", () => {
  const evening = reflection("2026-10-29");
  const morning: DailyCheckIn = {
    ...reflection("2026-10-29"),
    period: "morning",
    note: "A separate start to the day.",
  };
  assert.equal(getCheckInPeriod(evening), "evening");
  assert.equal(getCheckInPeriod(morning), "morning");
  assert.equal(checkInForDay([morning, evening], evening.day), evening);
  assert.equal(
    checkInForDay([morning, evening], morning.day, "morning"),
    morning,
  );
  assert.equal(checkInForDay([morning], morning.day), undefined);
  assert.equal(checkInForDay([evening], evening.day, "morning"), undefined);
});

test("Morning opens at the journal's 06:00 tracking boundary and remains available after midnight", () => {
  const zone = "Europe/Vienna";
  const beforeReset = new Date("2026-10-30T04:59:59Z");
  const reset = new Date("2026-10-30T05:00:00Z");
  assert.equal(canCheckIn("2026-10-30", beforeReset, zone, "morning"), false);
  assert.equal(canCheckIn("2026-10-30", reset, zone, "morning"), true);
  assert.equal(canCheckIn("2026-10-30", reset, zone, "evening"), false);
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-31T03:00:00Z"), zone, "morning"),
    true,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-31T05:00:00Z"), zone, "morning"),
    true,
    "the previous Morning remains editable in history after reset",
  );
  assert.equal(
    canCheckIn("2026-10-31", new Date("2026-10-31T05:00:00Z"), zone, "morning"),
    true,
  );
  assert.equal(canCheckIn("2026-02-30", reset, zone, "morning"), false);
  assert.equal(canCheckIn("2026-10-31", reset, zone, "morning"), false);
});

test("Morning availability follows the journal zone and both daylight-saving boundaries", () => {
  const now = new Date("2026-10-30T02:00:00Z");
  assert.equal(canCheckIn("2026-10-30", now, "Asia/Tokyo", "morning"), true);
  assert.equal(
    canCheckIn("2026-10-30", now, "Europe/Vienna", "morning"),
    false,
  );
  for (const [before, reset, day] of [
    ["2026-03-29T03:59:59Z", "2026-03-29T04:00:00Z", "2026-03-29"],
    ["2026-10-25T04:59:59Z", "2026-10-25T05:00:00Z", "2026-10-25"],
  ]) {
    assert.equal(
      canCheckIn(day, new Date(before), "Europe/Vienna", "morning"),
      false,
    );
    assert.equal(
      canCheckIn(day, new Date(reset), "Europe/Vienna", "morning"),
      true,
    );
  }
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
  assert.deepEqual(
    journalDays(
      [],
      [
        reflection("2026-10-29"),
        { ...reflection("2026-10-29"), period: "morning" },
        { ...reflection("2026-10-28"), period: "morning" },
      ],
      "Europe/Vienna",
    ),
    ["2026-10-29", "2026-10-28"],
    "two periods on one day count as one historical day, including Morning-only days",
  );
});
