import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyData,
  totalsForDay,
  type Intake,
  type Medication,
} from "./domain";
import { withCurrentMedicationDetails } from "./medication-history";

function medication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "medication-a",
    name: "Current Name",
    strengthMg: 2,
    defaultQuantity: 3,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

function intake(overrides: Partial<Intake> = {}): Intake {
  return {
    id: "intake-a",
    medicationId: "medication-a",
    medicationName: "Old Name",
    strengthMg: 0.5,
    quantity: 0.5,
    takenAt: "2026-10-25T10:00:29Z",
    createdAt: "2026-10-26T10:00:37Z",
    note: "Keep my actual amount and this note.",
    ...overrides,
  };
}

test("current medication details reach all past days, including archived medications and legacy entries", () => {
  const data = emptyData();
  data.medications = [medication({ form: "pump-bottle", archived: true })];
  data.intakes = [
    intake({ medicationForm: "tablet" }),
    intake({
      id: "older-entry-without-a-type",
      takenAt: "2026-09-01T10:00:29Z",
      createdAt: "2026-09-01T10:00:37Z",
      quantity: 2.5,
    }),
  ];
  const original = structuredClone(data);
  const result = withCurrentMedicationDetails(data);
  assert.deepEqual(
    result.intakes,
    data.intakes.map((entry) => ({
      ...entry,
      medicationName: "Current Name",
      strengthMg: 2,
      medicationForm: "pump-bottle",
    })),
  );
  assert.deepEqual(
    data,
    original,
    "projecting a read must not mutate its input",
  );
});

test("historical totals recalculate with current strengths while quantities and medication groups stay separate", () => {
  const data = emptyData();
  data.medications = [
    medication({ strengthMg: 4 }),
    medication({
      id: "medication-b",
      name: "Other Medication",
      strengthMg: 10,
    }),
  ];
  data.intakes = [
    intake(),
    intake({ id: "intake-b", quantity: 1.5 }),
    intake({
      id: "intake-c",
      medicationId: "medication-b",
      quantity: 0.25,
    }),
  ];
  data.goals = [
    {
      id: "goal-a",
      medicationId: "medication-a",
      dailyLimitMg: 5,
      startsOn: "2026-10-01",
      endsOn: null,
      note: "My chosen target stays the same.",
      createdAt: "2026-10-01T10:00:00Z",
    },
  ];
  const result = withCurrentMedicationDetails(data);
  assert.deepEqual(totalsForDay(result, "2026-10-25"), [
    {
      medicationId: "medication-a",
      medicationName: "Current Name",
      totalMg: 8,
      count: 2,
    },
    {
      medicationId: "medication-b",
      medicationName: "Other Medication",
      totalMg: 2.5,
      count: 1,
    },
  ]);
  assert.deepEqual(result.goals, data.goals);
  assert.deepEqual(result.settings, data.settings);
});

test("missing medications retain their saved fallback name, strength and unit", () => {
  const data = emptyData();
  data.medications = [medication({ id: "unrelated-medication" })];
  data.intakes = [intake({ medicationForm: "drops" })];
  assert.equal(withCurrentMedicationDetails(data), data);
  assert.deepEqual(totalsForDay(data, "2026-10-25"), [
    {
      medicationId: "medication-a",
      medicationName: "Old Name",
      totalMg: 0.25,
      count: 1,
    },
  ]);
});

test("reconciliation is idempotent and leaves already current and unrelated entries intact", () => {
  const data = emptyData();
  data.medications = [medication()];
  data.intakes = [
    intake(),
    intake({
      id: "already-current",
      medicationName: "Current Name",
      strengthMg: 2,
      medicationForm: "tablet",
    }),
    intake({ id: "orphan", medicationId: "missing-medication" }),
  ];
  const result = withCurrentMedicationDetails(data);
  assert.equal(result.intakes[1], data.intakes[1]);
  assert.equal(result.intakes[2], data.intakes[2]);
  assert.equal(withCurrentMedicationDetails(result), result);
  assert.equal(result.medications, data.medications);
});

test("default quantity, appearance and archive edits do not alter an actual recorded intake", () => {
  const data = emptyData();
  data.medications = [medication()];
  data.intakes = [
    intake({
      medicationName: "Current Name",
      medicationForm: "tablet",
      strengthMg: 2,
      quantity: 0.25,
    }),
  ];
  const recorded = structuredClone(data.intakes);
  Object.assign(data.medications[0], {
    defaultQuantity: 10,
    activeIngredient: "An Optional Ingredient",
    color: "amber",
    icon: "heart",
    iconRotation: 90,
    archived: true,
  });
  assert.deepEqual(withCurrentMedicationDetails(data).intakes, recorded);
});
