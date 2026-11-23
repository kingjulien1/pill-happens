import assert from "node:assert/strict";
import { test } from "node:test";
import type { Intake } from "./domain";
import { formatIntakeGap, priorMedicationIntake } from "./intake-context";

const record = (id: string, takenAt: string, medicationId = "a"): Intake => ({
  id,
  medicationId,
  medicationName: medicationId,
  strengthMg: 10,
  quantity: 1,
  takenAt,
  createdAt: takenAt,
  note: "",
});

test("prior intake follows the selected medicine and selected time, including backdating", () => {
  const entries = [
    record("future", "2026-11-20T16:00:00Z"),
    record("other-med", "2026-11-20T11:59:00Z", "b"),
    record("earlier", "2026-11-19T10:00:00Z"),
    record("previous", "2026-11-20T10:00:00Z"),
    record("invalid", "not-a-timestamp"),
  ];
  assert.equal(
    priorMedicationIntake(entries, "a", "2026-11-20T12:00:00Z")?.id,
    "previous",
  );
  assert.equal(
    priorMedicationIntake(entries, "a", "2026-11-20T09:00:00Z")?.id,
    "earlier",
  );
  assert.equal(
    priorMedicationIntake(entries, "b", "2026-11-20T12:00:00Z")?.id,
    "other-med",
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["future", "other-med", "earlier", "previous", "invalid"],
  );
});

test("an edit excludes itself and still detects another log at the same instant", () => {
  const entries = [
    record("earlier", "2026-11-20T10:00:00Z"),
    record("same-a", "2026-11-20T12:00:00Z"),
    record("same-b", "2026-11-20T12:00:00Z"),
  ];
  assert.equal(
    priorMedicationIntake(entries, "a", "2026-11-20T12:00:00Z", "same-b")?.id,
    "same-a",
  );
  assert.equal(
    priorMedicationIntake(
      entries.slice(0, 2),
      "a",
      "2026-11-20T12:00:00Z",
      "same-a",
    )?.id,
    "earlier",
  );
});

test("empty, missing and invalid contexts never fabricate a previous record", () => {
  const entries = [record("saved", "2026-11-20T12:00:00Z")];
  assert.equal(
    priorMedicationIntake([], "a", "2026-11-20T12:00:00Z"),
    undefined,
  );
  assert.equal(
    priorMedicationIntake(entries, "", "2026-11-20T12:00:00Z"),
    undefined,
  );
  assert.equal(
    priorMedicationIntake(entries, "missing", "2026-11-20T12:00:00Z"),
    undefined,
  );
  assert.equal(priorMedicationIntake(entries, "a", "invalid"), undefined);
  assert.equal(
    priorMedicationIntake(entries, "a", "2026-11-20T11:00:00Z"),
    undefined,
  );
  assert.equal(
    priorMedicationIntake(entries, "a", "2026-11-20T12:00:00Z", "saved"),
    undefined,
  );
});

test("a new server history takes effect immediately without stale prior amounts", () => {
  const original = [record("saved", "2026-11-20T10:00:00Z")];
  assert.equal(
    priorMedicationIntake(original, "a", "2026-11-20T12:00:00Z")?.quantity,
    1,
  );
  const updated = [{ ...original[0], quantity: 2 }];
  assert.equal(
    priorMedicationIntake(updated, "a", "2026-11-20T12:00:00Z")?.quantity,
    2,
  );
  const appended = [...updated, record("new", "2026-11-20T11:00:00Z")];
  assert.equal(
    priorMedicationIntake(appended, "a", "2026-11-20T12:00:00Z")?.id,
    "new",
  );
});

test("elapsed labels preserve seconds, whole minutes, hours and days without rounding up", () => {
  const start = "2026-11-20T00:00:00Z";
  for (const [end, expected] of [
    [start, "Same time"],
    ["2026-11-20T00:00:30Z", "< 1 min"],
    ["2026-11-20T00:59:59Z", "59 min"],
    ["2026-11-20T02:00:00Z", "2h"],
    ["2026-11-20T02:35:00Z", "2h 35m"],
    ["2026-11-22T03:59:00Z", "2d 3h"],
  ])
    assert.equal(formatIntakeGap(start, end), expected);
  assert.equal(formatIntakeGap("invalid", start), undefined);
  assert.equal(formatIntakeGap("2026-11-21T00:00:00Z", start), undefined);
});

test("the repeated DST hour is elapsed time rather than wall-clock subtraction", () => {
  const first = "2026-10-25T02:30:00+02:00";
  const second = "2026-10-25T02:30:00+01:00";
  assert.equal(formatIntakeGap(first, second), "1h");
  const entries = [record("first", first), record("edited", second)];
  assert.equal(
    priorMedicationIntake(entries, "a", second, "edited")?.id,
    "first",
  );
});
