import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, shiftDayKey } from "./domain";
import {
  groupHistoryWeeks,
  visibleHistoryWeeks,
  type HistoryWeek,
} from "./history-weeks";

function recordedDays(weeks: readonly HistoryWeek[]): string[] {
  return weeks.flatMap((week) => week.days);
}

function consecutiveDays(newest: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftDayKey(newest, -index),
  );
}

test("empty history and a single recorded day need no placeholder days", () => {
  assert.deepEqual(groupHistoryWeeks([]), []);
  assert.deepEqual(groupHistoryWeeks(["2026-10-28"]), [
    {
      id: "2026-10-26",
      start: "2026-10-26",
      end: "2026-11-01",
      weekNumber: 44,
      weekYear: 2026,
      days: ["2026-10-28"],
    },
  ]);
});

test("Sunday finishes a week and Monday begins the next, newest first", () => {
  const days = consecutiveDays("2026-11-02", 8).reverse();
  const weeks = groupHistoryWeeks(days);
  assert.deepEqual(
    weeks.map(({ start, end, weekNumber, days }) => ({
      start,
      end,
      weekNumber,
      days,
    })),
    [
      {
        start: "2026-11-02",
        end: "2026-11-08",
        weekNumber: 45,
        days: ["2026-11-02"],
      },
      {
        start: "2026-10-26",
        end: "2026-11-01",
        weekNumber: 44,
        days: consecutiveDays("2026-11-01", 7),
      },
    ],
  );
});

test("New Year uses the ISO week year, including week 53", () => {
  const weeks = groupHistoryWeeks([
    "2021-01-04",
    "2021-01-03",
    "2021-01-01",
    "2020-12-31",
    "2020-12-28",
    "2019-01-01",
    "2018-12-31",
  ]);
  assert.deepEqual(
    weeks.map(({ start, end, weekNumber, weekYear }) => ({
      start,
      end,
      weekNumber,
      weekYear,
    })),
    [
      {
        start: "2021-01-04",
        end: "2021-01-10",
        weekNumber: 1,
        weekYear: 2021,
      },
      {
        start: "2020-12-28",
        end: "2021-01-03",
        weekNumber: 53,
        weekYear: 2020,
      },
      {
        start: "2018-12-31",
        end: "2019-01-06",
        weekNumber: 1,
        weekYear: 2019,
      },
    ],
  );
  assert.deepEqual(weeks[1].days, [
    "2021-01-03",
    "2021-01-01",
    "2020-12-31",
    "2020-12-28",
  ]);
});

test("a new calendar year can still belong to the previous year's week 52", () => {
  const [week] = groupHistoryWeeks(["2022-01-01", "2022-01-02"]);
  assert.equal(week.weekYear, 2021);
  assert.equal(week.weekNumber, 52);
  assert.equal(week.start, "2021-12-27");
  assert.equal(week.end, "2022-01-02");
});

test("valid leap days stay in their calendar week without accepting normalized dates", () => {
  const weeks = groupHistoryWeeks([
    "2028-03-01",
    "2028-02-29",
    "2028-02-28",
    "2026-02-29",
    "2100-02-29",
  ]);
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].start, "2028-02-28");
  assert.equal(weeks[0].end, "2028-03-05");
  assert.equal(weeks[0].weekNumber, 9);
  assert.deepEqual(weeks[0].days, ["2028-03-01", "2028-02-29", "2028-02-28"]);
  assert.deepEqual(groupHistoryWeeks(["2000-02-29"])[0].days, ["2000-02-29"]);
});

test("configured tracking days retain the 06:00 boundary through both DST changes", () => {
  for (const [beforeReset, reset, sunday, monday] of [
    [
      "2026-03-30T03:59:59.000Z",
      "2026-03-30T04:00:00.000Z",
      "2026-03-29",
      "2026-03-30",
    ],
    [
      "2026-10-26T04:59:59.000Z",
      "2026-10-26T05:00:00.000Z",
      "2026-10-25",
      "2026-10-26",
    ],
  ]) {
    const days = [
      dayKey(beforeReset, "Europe/Vienna"),
      dayKey(reset, "Europe/Vienna"),
    ];
    assert.deepEqual(days, [sunday, monday]);
    const weeks = groupHistoryWeeks(days);
    assert.equal(weeks.length, 2);
    assert.equal(weeks[0].start, monday);
    assert.equal(weeks[1].end, sunday);
    assert.deepEqual(recordedDays(weeks), [monday, sunday]);
  }
});

test("journal timezone day labels are used without interpreting them as instants again", () => {
  const instant = "2026-11-02T00:30:00.000Z";
  const tokyo = dayKey(instant, "Asia/Tokyo");
  const losAngeles = dayKey(instant, "America/Los_Angeles");
  assert.equal(tokyo, "2026-11-02");
  assert.equal(losAngeles, "2026-11-01");
  assert.equal(groupHistoryWeeks([tokyo])[0].weekNumber, 45);
  assert.equal(groupHistoryWeeks([losAngeles])[0].weekNumber, 44);
});

test("unsorted duplicate and invalid keys cannot inflate recorded days or mutate input", () => {
  const days = Object.freeze([
    "2026-10-28",
    "2026-11-02",
    "2026-10-26",
    "2026-10-28",
    "",
    "not-a-date",
    "2026-11-31",
    "2026-13-01",
    "2026-1-02",
    "2026-11-02T00:00:00.000Z",
  ]);
  const snapshot = [...days];
  const weeks = groupHistoryWeeks(days);
  assert.deepEqual(recordedDays(weeks), [
    "2026-11-02",
    "2026-10-28",
    "2026-10-26",
  ]);
  assert.deepEqual(days, snapshot);
  assert.deepEqual(groupHistoryWeeks(["invalid", "2026-02-30"]), []);
});

test("sparse and reflection-only day keys need no intake records or empty week fillers", () => {
  const weeks = groupHistoryWeeks(["2026-11-11", "2026-10-01"]);
  assert.deepEqual(
    weeks.map(({ id, days }) => ({ id, days })),
    [
      { id: "2026-11-09", days: ["2026-11-11"] },
      { id: "2026-09-28", days: ["2026-10-01"] },
    ],
  );
});

test("week identity stays stable when a historical day is added or removed", () => {
  const [before] = groupHistoryWeeks(["2026-10-28"]);
  const [after] = groupHistoryWeeks(["2026-11-01", "2026-10-28", "2026-10-26"]);
  assert.equal(after.id, before.id);
  assert.deepEqual(groupHistoryWeeks(["2026-10-26"])[0].id, before.id);
});

test("a 20-day budget includes the complete boundary week and no days twice", () => {
  const days = consecutiveDays("2026-11-08", 49);
  const weeks = groupHistoryWeeks(days);
  const first = visibleHistoryWeeks(weeks, 20);
  const second = visibleHistoryWeeks(weeks, 40);
  const third = visibleHistoryWeeks(weeks, 60);
  assert.equal(recordedDays(first).length, 21);
  assert.equal(recordedDays(second).length, 42);
  assert.deepEqual(recordedDays(third), days);
  assert.deepEqual(second.slice(0, first.length), first);
  assert.deepEqual(third.slice(0, second.length), second);
  assert.equal(new Set(recordedDays(third)).size, days.length);
  assert.ok(first.every((week) => week.days.length === 7));
});

test("partial newest weeks count recorded days while page boundaries remain whole weeks", () => {
  const weeks = groupHistoryWeeks(consecutiveDays("2026-11-04", 52));
  const visible = visibleHistoryWeeks(weeks, 20);
  assert.equal(visible[0].days.length, 3);
  assert.equal(recordedDays(visible).length, 24);
  assert.equal(visible.length, 4);
  assert.equal(visible[3], weeks[3]);
  assert.deepEqual(visibleHistoryWeeks(weeks, 3), weeks.slice(0, 1));
  assert.deepEqual(visibleHistoryWeeks(weeks, 4), weeks.slice(0, 2));
});

test("pagination counts sparse recorded days rather than seven-day calendar spans", () => {
  const days = Array.from({ length: 45 }, (_, index) =>
    shiftDayKey("2026-11-02", -index * 7),
  );
  const weeks = groupHistoryWeeks(days);
  assert.equal(visibleHistoryWeeks(weeks, 20).length, 20);
  assert.equal(visibleHistoryWeeks(weeks, 40).length, 40);
  assert.deepEqual(recordedDays(visibleHistoryWeeks(weeks, 60)), days);
});

test("empty, exhausted, and nonpositive budgets do not invent visible weeks", () => {
  const weeks = groupHistoryWeeks(["2026-10-28"]);
  assert.deepEqual(visibleHistoryWeeks([], 20), []);
  for (const budget of [0, -1, Number.NaN, 0.5]) {
    assert.deepEqual(visibleHistoryWeeks(weeks, budget), []);
  }
  assert.deepEqual(visibleHistoryWeeks(weeks, 1), weeks);
  assert.deepEqual(visibleHistoryWeeks(weeks, 20), weeks);
  assert.deepEqual(visibleHistoryWeeks(weeks, Number.POSITIVE_INFINITY), weeks);
  assert.notEqual(visibleHistoryWeeks(weeks, 20), weeks);
});
