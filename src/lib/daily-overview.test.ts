import assert from "node:assert/strict";
import test from "node:test";
import { dailyOverview } from "./daily-overview";
import {
  emptyData,
  totalsForDay,
  type AppData,
  type Goal,
  type Intake,
  type Medication,
} from "./domain";

const day = "2026-10-30";

function medication(id: string, fields: Partial<Medication> = {}): Medication {
  return {
    id,
    name: `Current ${id}`,
    strengthMg: 2,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: "2026-10-01T12:00:00Z",
    ...fields,
  };
}

function intake(
  id: string,
  medicationId: string,
  takenAt: string,
  fields: Partial<Intake> = {},
): Intake {
  return {
    id,
    medicationId,
    medicationName: `Saved ${medicationId}`,
    medicationForm: "tablet",
    strengthMg: 2,
    quantity: 1,
    takenAt,
    createdAt: takenAt,
    note: "",
    ...fields,
  };
}

function goal(
  id: string,
  medicationId: string,
  fields: Partial<Goal> = {},
): Goal {
  return {
    id,
    medicationId,
    dailyLimitMg: 10,
    startsOn: "2026-10-01",
    endsOn: null,
    note: "",
    createdAt: "2026-10-01T12:00:00Z",
    ...fields,
  };
}

test("empty days have no actual counts or last time; an effective goal can still have a zero row", () => {
  const data = emptyData();
  assert.deepEqual(dailyOverview(data, day), {
    intakeCount: 0,
    medicationCount: 0,
    lastTakenAt: null,
    rows: [],
  });
  data.goals = [goal("active", "without-metadata")];
  const result = dailyOverview(data, day);
  assert.equal(result.intakeCount, 0);
  assert.equal(result.medicationCount, 0);
  assert.equal(result.lastTakenAt, null);
  assert.deepEqual(result.rows, [
    {
      medicationId: "without-metadata",
      name: "Medication",
      medication: undefined,
      totalMg: 0,
      intakeCount: 0,
      lastTakenAt: null,
      goal: data.goals[0],
    },
  ]);
});

test("fractional doses retain domain precision and entry counts never become quantities or cross-medication totals", () => {
  const data = emptyData();
  data.intakes = [
    intake("one", "a", "2026-10-30T10:00:00Z", {
      strengthMg: 0.1,
      quantity: 1,
    }),
    intake("two", "a", "2026-10-30T11:00:00Z", {
      strengthMg: 0.1,
      quantity: 2,
    }),
    intake("other", "b", "2026-10-30T12:00:00Z", {
      strengthMg: 1.25,
      quantity: 2.5,
    }),
  ];
  const result = dailyOverview(data, day);
  assert.equal(result.intakeCount, 3);
  assert.equal(result.medicationCount, 2);
  assert.deepEqual(
    result.rows.map(({ medicationId, totalMg, intakeCount }) => ({
      medicationId,
      totalMg,
      intakeCount,
    })),
    [
      { medicationId: "a", totalMg: 0.3, intakeCount: 2 },
      { medicationId: "b", totalMg: 3.125, intakeCount: 1 },
    ],
  );
  assert.deepEqual(
    result.rows.map((row) => row.totalMg),
    totalsForDay(data, day).map((total) => total.totalMg),
  );
});

test("last-taken times follow actual instants, never late creation or ISO-string lexical order", () => {
  const data = emptyData();
  data.intakes = [
    intake("backfilled", "a", "2026-10-30T09:30:00Z", {
      createdAt: "2026-10-30T23:00:00Z",
    }),
    intake("latest-a", "a", "2026-10-30T12:00:00+02:00", {
      createdAt: "2026-10-30T10:00:01Z",
    }),
    intake("latest-all", "b", "2026-10-30T10:30:00Z", {
      createdAt: "2026-10-30T10:30:00Z",
    }),
  ];
  const result = dailyOverview(data, day);
  assert.equal(result.lastTakenAt, "2026-10-30T10:30:00Z");
  assert.equal(
    result.rows.find((row) => row.medicationId === "a")!.lastTakenAt,
    "2026-10-30T12:00:00+02:00",
  );
  assert.equal(
    result.rows.find((row) => row.medicationId === "b")!.lastTakenAt,
    result.lastTakenAt,
  );
});

test("journal timezone and the 06:00 boundary place after-midnight intakes in their original tracking day", () => {
  const data = emptyData();
  data.intakes = [
    intake("prior-day", "a", "2026-10-30T04:59:59Z"),
    intake("opening", "a", "2026-10-30T05:00:00Z"),
    intake("after-midnight", "b", "2026-10-31T00:30:00Z"),
    intake("last-second", "a", "2026-10-31T04:59:59Z"),
    intake("next-day", "a", "2026-10-31T05:00:00Z"),
  ];
  const result = dailyOverview(data, day);
  assert.equal(result.intakeCount, 3);
  assert.equal(result.medicationCount, 2);
  assert.equal(result.lastTakenAt, "2026-10-31T04:59:59Z");
  assert.equal(
    result.rows.find((row) => row.medicationId === "b")!.lastTakenAt,
    "2026-10-31T00:30:00Z",
  );
  data.settings.timezone = "Pacific/Kiritimati";
  data.intakes = [intake("date-line", "a", "2026-10-30T22:00:00Z")];
  assert.equal(dailyOverview(data, day).intakeCount, 0);
  assert.equal(dailyOverview(data, "2026-10-31").intakeCount, 1);
});

test("both repeated autumn hours count as actual entries in the same tracking day", () => {
  const data = emptyData();
  data.intakes = [
    intake("first-hour", "a", "2026-10-25T02:30:00+02:00"),
    intake("second-hour", "a", "2026-10-25T02:15:00+01:00"),
  ];
  const result = dailyOverview(data, "2026-10-24");
  assert.equal(result.intakeCount, 2);
  assert.equal(result.lastTakenAt, "2026-10-25T02:15:00+01:00");
});

test("row order retains actual totals first and then effective goal-only rows in their existing order", () => {
  const data = emptyData();
  data.intakes = [
    intake("a", "a", "2026-10-30T09:00:00Z", {
      createdAt: "2026-10-30T15:00:00Z",
    }),
    intake("b", "b", "2026-10-30T10:00:00Z", {
      createdAt: "2026-10-30T11:00:00Z",
    }),
  ];
  data.goals = [
    goal("only-c", "c"),
    goal("also-a", "a"),
    goal("only-d", "d"),
    goal("future", "e", { startsOn: "2026-11-01" }),
  ];
  const result = dailyOverview(data, day);
  assert.deepEqual(
    result.rows.map((row) => row.medicationId),
    ["b", "a", "c", "d"],
  );
  assert.equal(result.medicationCount, 2);
  assert.equal(
    result.rows.find((row) => row.medicationId === "a")!.goal?.id,
    "also-a",
  );
  for (const row of result.rows.slice(2)) {
    assert.equal(row.totalMg, 0);
    assert.equal(row.intakeCount, 0);
    assert.equal(row.lastTakenAt, null);
  }
});

test("expired superseding goals never resurrect an older goal or a goal-only row", () => {
  const data = emptyData();
  data.goals = [
    goal("older", "a"),
    goal("newer-expired", "a", {
      startsOn: "2026-10-20",
      endsOn: "2026-10-25",
    }),
    goal("future", "a", { startsOn: "2026-11-01" }),
  ];
  assert.deepEqual(dailyOverview(data, day).rows, []);
  data.intakes = [intake("actual", "a", "2026-10-30T10:00:00Z")];
  assert.equal(dailyOverview(data, day).rows[0].goal, undefined);
  assert.equal(
    dailyOverview(data, "2026-10-24").rows[0].goal?.id,
    "newer-expired",
  );
  assert.equal(dailyOverview(data, "2026-11-01").rows[0].goal?.id, "future");
});

test("archived and missing medications retain exact doses, current names, snapshot fallbacks and class metadata", () => {
  const data = emptyData();
  const archived = medication("archived", {
    name: "Renamed Archived",
    strengthMg: 100,
    archived: true,
    isBenzodiazepine: true,
    isOpioid: true,
    categories: ["benzodiazepine", "opioid"],
  });
  data.medications = [archived];
  data.intakes = [
    intake("known", "archived", "2026-10-30T10:00:00Z", { quantity: 1.25 }),
    intake("missing", "missing", "2026-10-30T11:00:00Z", {
      medicationName: "Recorded Snapshot",
      strengthMg: 7,
      quantity: 0.5,
    }),
  ];
  const result = dailyOverview(data, day);
  assert.equal(result.rows[0].name, "Renamed Archived");
  assert.equal(result.rows[0].medication, archived);
  assert.equal(
    result.rows[0].totalMg,
    2.5,
    "the helper preserves domain dose calculations rather than substituting a new strength",
  );
  assert.equal(result.rows[0].medication!.isBenzodiazepine, true);
  assert.equal(result.rows[0].medication!.isOpioid, true);
  assert.deepEqual(result.rows[0].medication!.categories, [
    "benzodiazepine",
    "opioid",
  ]);
  assert.equal(result.rows[1].name, "Recorded Snapshot");
  assert.equal(result.rows[1].medication, undefined);
  assert.equal(result.rows[1].totalMg, 3.5);
});

test("legacy template receipts without intake records never enter daily totals or counts", () => {
  const data = emptyData();
  data.medications = [medication("saved-medication")];
  assert.deepEqual(dailyOverview(data, day), {
    intakeCount: 0,
    medicationCount: 0,
    lastTakenAt: null,
    rows: [],
  });
  data.preparedIntakeCompletions = [
    {
      groupId: "morning",
      day,
      confirmedAt: "2026-10-30T10:00:00Z",
      intakeIds: ["deleted-a", "deleted-b", "deleted-c"],
    },
  ];
  assert.deepEqual(dailyOverview(data, day), {
    intakeCount: 0,
    medicationCount: 0,
    lastTakenAt: null,
    rows: [],
  });
});

test("deriving overview data never mutates frozen medication, intake or goal records", () => {
  const data: AppData = {
    ...emptyData(),
    medications: [medication("a")],
    intakes: [
      intake("later", "a", "2026-10-30T12:00:00Z"),
      intake("earlier", "a", "2026-10-30T10:00:00Z"),
    ],
    goals: [goal("a-goal", "a")],
  };
  const before = structuredClone(data);
  const freeze = (value: unknown) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  };
  freeze(data);
  const result = dailyOverview(data, day);
  assert.equal(result.intakeCount, 2);
  assert.equal(result.lastTakenAt, "2026-10-30T12:00:00Z");
  assert.deepEqual(data, before);
});
