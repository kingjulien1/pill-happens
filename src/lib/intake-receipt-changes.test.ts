import assert from "node:assert/strict";
import test from "node:test";
import { intakeReceiptChanges } from "./intake-receipt-changes";
import type { IntakeSnapshot } from "./intake-update-preview";

const before: IntakeSnapshot = {
  kind: "intake",
  name: "Ritalin",
  quantity: 1,
  strengthMg: 10,
  form: "tablet",
  route: "oral",
  takenAt: "2026-11-23T14:00:00Z",
  timeZone: "Europe/Vienna",
};

test("quantity and strength produce one complete calculation change, even with an equal total", () => {
  assert.deepEqual(
    intakeReceiptChanges(
      before,
      { ...before, quantity: 2, strengthMg: 5 },
      false,
    ),
    [
      {
        field: "amount",
        label: "Amount",
        before: "1 × 10 mg = 10 mg",
        after: "2 × 5 mg = 10 mg",
        context: "Quantity × strength = total dose",
      },
    ],
  );
});
test("time, route and type retain old values while the entire dose is one saved change", () => {
  const after = {
    ...before,
    quantity: 1.5,
    takenAt: "2026-11-23T16:39:00Z",
    route: "nasal" as const,
    form: "capsule" as const,
  };
  const rows = intakeReceiptChanges(before, after, false);
  assert.deepEqual(
    rows.map((row) => row.field),
    ["time", "route", "form", "amount"],
  );
  assert.equal(rows[0].after, "17:39 · Nov 23");
  assert.equal(rows.at(-1)?.after, "1.5 × 10 mg = 15 mg");
  assert.equal(after.quantity, 1.5);
  assert.equal(before.quantity, 1);
});
test("identical saves and legacy medication switches do not invent highlighted values", () => {
  assert.deepEqual(
    intakeReceiptChanges(
      before,
      { ...before, takenAt: "2026-11-23T15:00:00+01:00" },
      false,
    ),
    [],
  );
  assert.deepEqual(
    intakeReceiptChanges(
      before,
      { ...before, name: "Another medication", quantity: 2 },
      true,
    ),
    [],
  );
});
