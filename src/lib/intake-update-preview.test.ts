import assert from "node:assert/strict";
import test from "node:test";
import {
  intakeUpdatePreview,
  type IntakeSnapshot,
} from "./intake-update-preview";

const record: IntakeSnapshot = {
  kind: "intake",
  name: "Ritalin",
  quantity: 1,
  strengthMg: 10,
  form: "tablet",
  route: "oral",
  takenAt: "2026-11-22T13:39:00Z",
  timeZone: "Europe/Vienna",
};

test("one edit reports only changed fields and its calculated total", () => {
  const result = intakeUpdatePreview(record, {
    ...record,
    quantity: 1.5,
    takenAt: "2026-11-22T14:10:00Z",
    route: "nasal",
  });
  assert.equal(result.switched, false);
  assert.deepEqual(result.rows, [
    {
      field: "time",
      label: "Time",
      before: "14:39 · Nov 22",
      after: "15:10 · Nov 22",
    },
    {
      field: "quantity",
      label: "Amount",
      before: "1 tablet",
      after: "1.5 tablets",
    },
    { field: "route", label: "Route", before: "Swallowed", after: "Nasal" },
  ]);
  assert.deepEqual(result.total, { before: "10 mg", after: "15 mg" });
});

test("strength and physical type have separate history rows; an unchanged total is not highlighted", () => {
  const result = intakeUpdatePreview(
    record,
    { ...record, quantity: 2, strengthMg: 5, form: "capsule" },
    false,
  );
  assert.deepEqual(
    result.rows.map((row) => [row.field, row.before, row.after]),
    [
      ["quantity", "1 tablet", "2 capsules"],
      ["strength", "10 mg", "5 mg"],
      ["form", "Tablet", "Capsule"],
    ],
  );
  assert.equal(result.total, undefined);
});

test("authoritative medication identity recognizes a switch even with identical names", () => {
  const result = intakeUpdatePreview(
    record,
    { ...record, quantity: 2, strengthMg: 20 },
    true,
  );
  assert.equal(result.switched, true);
  assert.deepEqual(result.rows, []);
  assert.equal(result.total, undefined);
});

test("an explicit same-medication flag distinguishes a rename from legacy switch snapshots", () => {
  const renamed = { ...record, name: "Renamed Ritalin" };
  assert.equal(intakeUpdatePreview(record, renamed).switched, true);
  const result = intakeUpdatePreview(record, renamed, false);
  assert.equal(result.switched, false);
  assert.deepEqual(result.rows, [
    {
      field: "name",
      label: "Name",
      before: "Ritalin",
      after: "Renamed Ritalin",
    },
  ]);
});

test("equivalent instants and unspecified routes do not invent changes", () => {
  const result = intakeUpdatePreview(
    { ...record, route: undefined },
    { ...record, route: "unspecified", takenAt: "2026-11-22T14:39:00+01:00" },
  );
  assert.deepEqual(result.rows, []);
  assert.equal(result.total, undefined);
  assert.equal(result.switched, false);
});

test("date edits include differing years and repeated DST times include their offset", () => {
  const result = intakeUpdatePreview(
    { ...record, takenAt: "2025-11-22T13:39:00Z" },
    record,
  );
  assert.deepEqual(result.rows[0], {
    field: "time",
    label: "Time",
    before: "14:39 · Nov 22, 2025",
    after: "14:39 · Nov 22, 2026",
  });
  const repeated = intakeUpdatePreview(
    { ...record, takenAt: "2026-10-25T00:30:00Z" },
    { ...record, takenAt: "2026-10-25T01:30:00Z" },
  );
  assert.match(repeated.rows[0].before, /02:30:00 GMT\+2/);
  assert.match(repeated.rows[0].after, /02:30:00 GMT\+1/);
});

test("missing type metadata stays explicit and snapshots survive storage unchanged", () => {
  const before = { ...record, form: undefined, route: undefined };
  const result = intakeUpdatePreview(before, record, false);
  assert.equal(
    result.rows.find((row) => row.field === "form")?.before,
    "Not set",
  );
  assert.equal(
    result.rows.find((row) => row.field === "route")?.before,
    "Not specified",
  );
  const stored = JSON.parse(
    JSON.stringify({ before, after: record, medicationChanged: false }),
  );
  assert.deepEqual(
    intakeUpdatePreview(stored.before, stored.after, stored.medicationChanged),
    result,
  );
});
