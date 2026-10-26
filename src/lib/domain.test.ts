import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dayIntakes,
  dayKey,
  doseMg,
  emptyData,
  formatDay,
  formatDose,
  fromLocalInput,
  goalForDay,
  isValidDayKey,
  shiftDayKey,
  toLocalInput,
  totalsForDay,
  type Goal,
  type Intake,
} from "./domain";

const zone = "Europe/Vienna";

describe("06:00 tracking-day boundary", () => {
  it("keeps entries before 06:00 on the previous local calendar day", () => {
    assert.equal(dayKey("2026-10-26T04:59:59Z", zone), "2026-10-25");
    assert.equal(dayKey("2026-10-26T05:00:00Z", zone), "2026-10-26");
    assert.equal(dayKey("2026-10-25T23:00:00Z", zone), "2026-10-25");
  });

  it("uses calendar days rather than six elapsed hours at spring DST", () => {
    assert.equal(dayKey("2026-03-29T03:59:59Z", zone), "2026-03-28");
    assert.equal(dayKey("2026-03-29T04:00:00Z", zone), "2026-03-29");
    assert.equal(dayKey("2026-03-29T04:30:00Z", zone), "2026-03-29");
  });

  it("uses the 06:00 boundary after fall DST", () => {
    assert.equal(dayKey("2026-10-25T04:59:59Z", zone), "2026-10-24");
    assert.equal(dayKey("2026-10-25T05:00:00Z", zone), "2026-10-25");
    assert.equal(dayKey("2026-10-24T22:30:00Z", zone), "2026-10-24");
    assert.equal(dayKey("2026-10-25T00:30:00Z", zone), "2026-10-24");
    assert.equal(dayKey("2026-10-25T01:30:00Z", zone), "2026-10-24");
  });

  it("also supports timezones on either side of UTC", () => {
    assert.equal(dayKey("2026-10-26T13:59:00Z", "America/Los_Angeles"), "2026-10-26");
    assert.equal(dayKey("2026-10-26T12:59:00Z", "America/Los_Angeles"), "2026-10-25");
    assert.equal(dayKey("2026-10-25T20:59:00Z", "Asia/Tokyo"), "2026-10-25");
    assert.equal(dayKey("2026-10-25T21:00:00Z", "Asia/Tokyo"), "2026-10-26");
  });
});

describe("local datetime conversion", () => {
  it("uses the configured timezone independently of the host", () => {
    assert.equal(toLocalInput("2026-07-02T09:15:29Z", zone), "2026-07-02T11:15");
    assert.equal(fromLocalInput("2026-07-02T11:15", zone), "2026-07-02T09:15:00.000Z");
    assert.equal(fromLocalInput("2026-12-02T11:15", zone), "2026-12-02T10:15:00.000Z");
    assert.equal(fromLocalInput("2026-12-02T11:15:37", zone), "2026-12-02T10:15:37.000Z");
  });

  it("rejects skipped clock times and invalid calendar values", () => {
    assert.throws(() => fromLocalInput("2026-03-29T02:30", zone), /does not exist/);
    for (const value of ["2026-02-30T12:00", "2026-01-01T24:00", "2026-01-01T01:60", "bad"]) {
      assert.throws(() => fromLocalInput(value, zone), /valid date and time/);
    }
  });

  it("chooses the earlier occurrence of a repeated autumn hour", () => {
    assert.equal(fromLocalInput("2026-10-25T02:30", zone), "2026-10-25T00:30:00.000Z");
  });

  it("handles half-hour DST offsets", () => {
    assert.equal(fromLocalInput("2026-10-04T03:00", "Australia/Lord_Howe"), "2026-10-03T16:00:00.000Z");
    assert.throws(() => fromLocalInput("2026-10-04T02:15", "Australia/Lord_Howe"), /does not exist/);
  });
});

function entry(overrides: Partial<Intake> = {}): Intake {
  return {
    id: "entry-1",
    medicationId: "med-1",
    medicationName: "Medication A",
    strengthMg: 0.5,
    quantity: 1,
    takenAt: "2026-10-26T10:00:00Z",
    createdAt: "2026-10-26T10:00:00Z",
    note: "",
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    medicationId: "med-1",
    dailyLimitMg: 1,
    startsOn: "2026-10-20",
    endsOn: null,
    note: "",
    createdAt: "2026-10-20T12:00:00Z",
    ...overrides,
  };
}

describe("intake history and per-medication totals", () => {
  it("sorts oldest creation first while assigning the day by takenAt", () => {
    const data = emptyData();
    data.intakes = [
      entry({ id: "backdated", takenAt: "2026-10-26T06:00:00Z", createdAt: "2026-10-26T20:00:00Z" }),
      entry({ id: "first", takenAt: "2026-10-26T12:00:00Z", createdAt: "2026-10-26T12:00:00Z" }),
      entry({ id: "previous", takenAt: "2026-10-26T04:59:00Z" }),
    ];
    assert.deepEqual(dayIntakes(data, "2026-10-26").map((item) => item.id), ["first", "backdated"]);
    assert.deepEqual(dayIntakes(data, "2026-10-25").map((item) => item.id), ["previous"]);
    assert.equal(data.intakes[0].id, "backdated", "reading a day must not mutate stored order");
  });

  it("keeps medications separate and uses each entry’s historical strength", () => {
    const data = emptyData();
    data.intakes = [
      entry({ strengthMg: 0.5, quantity: 0.5 }),
      entry({ id: "entry-2", strengthMg: 0.25, quantity: 1 }),
      entry({ id: "entry-3", medicationId: "med-2", medicationName: "Medication B", strengthMg: 2, quantity: 1 }),
    ];
    assert.deepEqual(totalsForDay(data, "2026-10-26"), [
      { medicationId: "med-1", medicationName: "Medication A", totalMg: 0.5, count: 2 },
      { medicationId: "med-2", medicationName: "Medication B", totalMg: 2, count: 1 },
    ]);
  });

  it("does not accumulate binary floating-point dose artifacts", () => {
    assert.equal(doseMg({ strengthMg: 0.1, quantity: 3 }), 0.3);
    const data = emptyData();
    data.intakes = [entry({ strengthMg: 0.1 }), entry({ id: "entry-2", strengthMg: 0.2 })];
    assert.equal(totalsForDay(data, "2026-10-26")[0].totalMg, 0.3);
    assert.equal(formatDose(0.125), "0.125");
  });
});

describe("effective daily goals", () => {
  it("preserves earlier-day targets and chooses the latest effective goal", () => {
    const data = emptyData();
    data.goals = [
      goal(),
      goal({ id: "new", startsOn: "2026-10-26", dailyLimitMg: 0.75, createdAt: "2026-10-25T12:00:00Z" }),
      goal({ id: "latest", startsOn: "2026-10-26", dailyLimitMg: 0.5, createdAt: "2026-10-26T12:00:00Z" }),
      goal({ id: "future", startsOn: "2026-11-01", dailyLimitMg: 0.25 }),
      goal({ id: "other", medicationId: "med-2", startsOn: "2026-10-26" }),
    ];
    assert.equal(goalForDay(data, "med-1", "2026-10-25")?.id, "goal-1");
    assert.equal(goalForDay(data, "med-1", "2026-10-26")?.id, "latest");
    assert.equal(goalForDay(data, "med-1", "2026-11-01")?.id, "future");
    assert.equal(goalForDay(data, "missing", "2026-10-26"), undefined);
    assert.equal(goalForDay(data, "med-1", "2026-10-19"), undefined);
  });

  it("includes an end date and excludes the day after it", () => {
    const data = emptyData();
    data.goals = [goal({ endsOn: "2026-10-26" })];
    assert.equal(goalForDay(data, "med-1", "2026-10-26")?.id, "goal-1");
    assert.equal(goalForDay(data, "med-1", "2026-10-27"), undefined);
  });

  it("does not revive an older maximum when the superseding goal expires", () => {
    const data = emptyData();
    data.goals = [
      goal({ id: "older", dailyLimitMg: 2, startsOn: "2026-10-20", endsOn: null }),
      goal({ id: "newer", dailyLimitMg: 1, startsOn: "2026-10-25", endsOn: "2026-10-26" }),
      goal({ id: "future", dailyLimitMg: 0.75, startsOn: "2026-11-01", endsOn: null }),
    ];
    assert.equal(goalForDay(data, "med-1", "2026-10-24")?.id, "older");
    assert.equal(goalForDay(data, "med-1", "2026-10-26")?.id, "newer");
    assert.equal(goalForDay(data, "med-1", "2026-10-27"), undefined);
    assert.equal(goalForDay(data, "med-1", "2026-11-01")?.id, "future");
  });
});

describe("calendar dates", () => {
  it("validates actual leap days and shifts across calendar boundaries", () => {
    assert.equal(isValidDayKey("2028-02-29"), true);
    assert.equal(isValidDayKey("2026-02-29"), false);
    assert.equal(isValidDayKey("2026-13-01"), false);
    assert.equal(shiftDayKey("2026-01-01", -1), "2025-12-31");
    assert.equal(shiftDayKey("2028-02-28", 1), "2028-02-29");
    assert.equal(shiftDayKey("2026-03-29", 1), "2026-03-30");
    assert.equal(formatDay("2026-10-26", { weekday: "short", month: "short", day: "numeric" }), "Mon, Oct 26");
    assert.throws(() => shiftDayKey("2026-02-30", 1), /valid day/);
  });
});
