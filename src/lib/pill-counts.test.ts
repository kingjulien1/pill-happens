import assert from "node:assert/strict";
import test from "node:test";
import { dayIntakes, emptyData, type Intake, type Medication } from "./domain";
import {
  countOpioidPills,
  countPills,
  countStimulantPills,
} from "./pill-counts";

function medication(id: string, fields: Partial<Medication> = {}): Medication {
  return {
    id,
    name: `Medication ${id}`,
    strengthMg: 100,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: "2026-10-01T12:00:00Z",
    ...fields,
  };
}

function intake(id: string, fields: Partial<Intake> = {}): Intake {
  return {
    id,
    medicationId: "a",
    medicationName: "Saved name",
    medicationForm: "tablet",
    strengthMg: 100,
    quantity: 1,
    takenAt: "2026-10-30T12:00:00Z",
    createdAt: "2026-10-30T12:00:00Z",
    note: "",
    ...fields,
  };
}

test("tablet and capsule counts sum fractional quantities, never records or milligrams", () => {
  const medications = [
    medication("a", { isBenzodiazepine: true }),
    medication("b", { form: "capsule", strengthMg: 2 }),
  ];
  const entries = [
    intake("quarter", { quantity: 0.25 }),
    intake("half", { quantity: 0.5 }),
    intake("capsules", {
      medicationId: "b",
      medicationForm: "capsule",
      quantity: 2,
    }),
  ];
  assert.deepEqual(countPills(entries, medications), {
    pills: 2.75,
    benzos: 0.75,
  });
});

test("decimal quantities use the same eight-place cleanup as other app counts", () => {
  const entries = [
    intake("first", { quantity: 0.1 }),
    intake("second", { quantity: 0.2 }),
  ];
  assert.deepEqual(
    countPills(entries, [medication("a", { isBenzodiazepine: true })]),
    { pills: 0.3, benzos: 0.3 },
  );
});

test("drops and dispenser quantities do not become pills even when marked as Benzo", () => {
  const entries = (
    ["drops", "pump", "pump-bottle", "gel-dispenser", "other"] as const
  ).map((form) => intake(form, { medicationForm: form, quantity: 4 }));
  assert.deepEqual(
    countPills(entries, [medication("a", { isBenzodiazepine: true })]),
    { pills: 0, benzos: 0 },
  );
});

test("the recorded form wins over current metadata, with metadata used only when it is missing", () => {
  const medications = [
    medication("tablet"),
    medication("drops", { form: "drops", isBenzodiazepine: true }),
  ];
  const entries = [
    intake("recorded-nonpill", {
      medicationId: "tablet",
      medicationForm: "drops",
      quantity: 10,
    }),
    intake("legacy-fallback", {
      medicationId: "tablet",
      medicationForm: undefined,
      quantity: 2,
    }),
    intake("recorded-capsule", {
      medicationId: "drops",
      medicationForm: "capsule",
      quantity: 0.25,
    }),
    intake("legacy-nonpill", {
      medicationId: "drops",
      medicationForm: undefined,
      quantity: 10,
    }),
  ];
  assert.deepEqual(countPills(entries, medications), {
    pills: 2.25,
    benzos: 0.25,
  });
});

test("missing medication metadata retains known pill quantities without guessing Benzo from names", () => {
  const entries = [
    intake("snapshot", { medicationName: "A Benzo-like name", quantity: 1.5 }),
    intake("unknown-form", { medicationForm: undefined, quantity: 3 }),
  ];
  assert.deepEqual(countPills(entries, []), { pills: 1.5, benzos: 0 });
});

test("current category selections override legacy flags and a dual classification counts Benzo only once", () => {
  const medications = [
    medication("cleared", { isBenzodiazepine: true, categories: [] }),
    medication("opioid-only", {
      isBenzodiazepine: true,
      categories: ["opioid"],
    }),
    medication("dual", {
      isBenzodiazepine: true,
      isOpioid: true,
      categories: ["benzodiazepine", "opioid", "benzodiazepine"],
    }),
    medication("legacy", { isBenzodiazepine: true, archived: true }),
  ];
  const entries = medications.map((item) =>
    intake(item.id, { medicationId: item.id, quantity: 0.5 }),
  );
  assert.deepEqual(countPills(entries, medications), { pills: 2, benzos: 1 });
});

test("invalid, nonpositive and nonfinite quantities are skipped without poisoning valid counts", () => {
  const entries = [-1, -0.25, 0, NaN, Infinity, -Infinity].map(
    (quantity, index) => intake(`invalid-${index}`, { quantity }),
  );
  entries.push(intake("valid", { quantity: 0.25 }));
  assert.deepEqual(
    countPills(entries, [medication("a", { isBenzodiazepine: true })]),
    { pills: 0.25, benzos: 0.25 },
  );
  assert.deepEqual(countPills([], []), { pills: 0, benzos: 0 });
});

test("callers select the journal's 06:00 day so after-midnight pills stay on the correct day", () => {
  const data = emptyData();
  data.medications = [medication("a", { isBenzodiazepine: true })];
  data.intakes = [
    intake("prior", { takenAt: "2026-10-30T04:59:59Z", quantity: 10 }),
    intake("opening", { takenAt: "2026-10-30T05:00:00Z", quantity: 1 }),
    intake("after-midnight", {
      takenAt: "2026-10-31T00:30:00Z",
      quantity: 0.25,
    }),
    intake("next", { takenAt: "2026-10-31T05:00:00Z", quantity: 10 }),
  ];
  assert.deepEqual(
    countPills(dayIntakes(data, "2026-10-30"), data.medications),
    { pills: 1.25, benzos: 1.25 },
  );
  data.settings.timezone = "Pacific/Kiritimati";
  data.intakes = [
    intake("date-line", { takenAt: "2026-10-30T22:00:00Z", quantity: 0.5 }),
  ];
  assert.deepEqual(
    countPills(dayIntakes(data, "2026-10-30"), data.medications),
    { pills: 0, benzos: 0 },
  );
  assert.deepEqual(
    countPills(dayIntakes(data, "2026-10-31"), data.medications),
    { pills: 0.5, benzos: 0.5 },
  );
});

test("both occurrences of the autumn DST hour remain separate quantities in the preceding tracking day", () => {
  const data = emptyData();
  data.medications = [medication("a", { isBenzodiazepine: true })];
  data.intakes = [
    intake("first-hour", {
      takenAt: "2026-10-25T02:30:00+02:00",
      quantity: 0.5,
    }),
    intake("second-hour", {
      takenAt: "2026-10-25T02:15:00+01:00",
      quantity: 0.25,
    }),
  ];
  assert.deepEqual(
    countPills(dayIntakes(data, "2026-10-24"), data.medications),
    { pills: 0.75, benzos: 0.75 },
  );
});

test("frozen source entries and archived classification metadata stay unchanged", () => {
  const entry = Object.freeze(intake("unchanged", { quantity: 2.5 }));
  const metadata = Object.freeze(
    medication("a", {
      archived: true,
      isBenzodiazepine: true,
      categories: ["benzodiazepine", "opioid"],
    }),
  );
  Object.freeze(metadata.categories);
  const entries = Object.freeze([entry]);
  const medications = Object.freeze([metadata]);
  const before = structuredClone({ entries, medications });
  assert.deepEqual(countPills(entries, medications), {
    pills: 2.5,
    benzos: 2.5,
  });
  assert.deepEqual({ entries, medications }, before);
});

test("opioid pill quantities respect manual selections, archived metadata and independent dual subsets", () => {
  const medications = [
    medication("cleared", { isOpioid: true, categories: [] }),
    medication("legacy", { isOpioid: true, archived: true }),
    medication("dual", { categories: ["opioid", "benzodiazepine", "opioid"] }),
    medication("benzo", { isOpioid: true, categories: ["benzodiazepine"] }),
    medication("ordinary", { name: "An opioid-like name" }),
  ];
  const quantities = [0.5, 1.25, 0.25, 10, 5];
  const entries = medications.map((item, index) =>
    intake(item.id, { medicationId: item.id, quantity: quantities[index] }),
  );
  assert.equal(countOpioidPills(entries, medications), 1.5);
  assert.deepEqual(countPills(entries, medications), {
    pills: 17,
    benzos: 10.25,
  });
});

test("opioid counts share recorded-form eligibility, finite-positive filtering and decimal cleanup", () => {
  const medications = [
    medication("tablet", { isOpioid: true }),
    medication("drops", { form: "drops", categories: ["opioid"] }),
  ];
  const entries = [
    intake("nonpill-snapshot", {
      medicationId: "tablet",
      medicationForm: "drops",
      quantity: 10,
    }),
    intake("legacy-form", {
      medicationId: "tablet",
      medicationForm: undefined,
      quantity: 0.1,
    }),
    intake("capsule-snapshot", {
      medicationId: "drops",
      medicationForm: "capsule",
      quantity: 0.2,
    }),
    intake("unknown-metadata", {
      medicationId: "missing",
      medicationName: "Opioid",
      quantity: 4,
    }),
    intake("unknown-form", {
      medicationId: "missing",
      medicationForm: undefined,
      quantity: 7,
    }),
    ...(
      ["drops", "pump", "pump-bottle", "gel-dispenser", "other"] as const
    ).map((form) =>
      intake(form, {
        medicationId: "tablet",
        medicationForm: form,
        quantity: 10,
      }),
    ),
    ...[-1, -0.25, 0, NaN, Infinity, -Infinity].map((quantity, index) =>
      intake(`invalid-opioid-${index}`, { medicationId: "tablet", quantity }),
    ),
  ];
  assert.equal(countOpioidPills(entries, medications), 0.3);
  assert.deepEqual(countPills(entries, medications), { pills: 4.3, benzos: 0 });
  assert.equal(countOpioidPills([], []), 0);
});

test("opioid counting keeps first metadata authoritative and never mutates frozen source records", () => {
  const entry = Object.freeze(intake("frozen-opioid", { quantity: 2.5 }));
  const first = Object.freeze(
    medication("a", { categories: [], isOpioid: true }),
  );
  const duplicate = Object.freeze(medication("a", { categories: ["opioid"] }));
  const entries = Object.freeze([entry]);
  const medications = Object.freeze([first, duplicate]);
  Object.freeze(first.categories);
  Object.freeze(duplicate.categories);
  const before = structuredClone({ entries, medications });
  assert.equal(countOpioidPills(entries, medications), 0);
  assert.equal(countOpioidPills(entries, [duplicate, first]), 2.5);
  assert.deepEqual(countPills(entries, medications), { pills: 2.5, benzos: 0 });
  assert.deepEqual({ entries, medications }, before);
});

test("opioid quantities follow the selected 06:00 tracking day across midnight and repeated DST hours", () => {
  const data = emptyData();
  data.medications = [medication("a", { categories: ["opioid"] })];
  data.intakes = [
    intake("before-reset", { takenAt: "2026-10-30T04:59:59Z", quantity: 10 }),
    intake("at-reset", { takenAt: "2026-10-30T05:00:00Z", quantity: 1 }),
    intake("after-midnight", {
      takenAt: "2026-10-31T00:30:00Z",
      quantity: 0.25,
    }),
    intake("next-reset", { takenAt: "2026-10-31T05:00:00Z", quantity: 10 }),
  ];
  assert.equal(
    countOpioidPills(dayIntakes(data, "2026-10-30"), data.medications),
    1.25,
  );
  data.intakes = [
    intake("dst-first", {
      takenAt: "2026-10-25T02:30:00+02:00",
      quantity: 0.5,
    }),
    intake("dst-second", {
      takenAt: "2026-10-25T02:15:00+01:00",
      quantity: 0.25,
    }),
  ];
  assert.equal(
    countOpioidPills(dayIntakes(data, "2026-10-24"), data.medications),
    0.75,
  );
});

test("stimulant units require manual categories, including archived records, without guessing from names or legacy flags", () => {
  const medications = [
    medication("selected", { categories: ["stimulant", "stimulant"] }),
    medication("legacy-flags", { isBenzodiazepine: true, isOpioid: true }),
    medication("name-only", {
      name: "Ritalin stimulant",
      activeIngredient: "Methylphenidate",
    }),
    medication("cleared", {
      categories: [],
      isBenzodiazepine: true,
      isOpioid: true,
    }),
    medication("other-category", { categories: ["opioid"] }),
    medication("archived", { categories: ["stimulant"], archived: true }),
  ];
  const quantities = [0.75, 2, 4, 3, 5, 1.25];
  const entries = medications.map((item, index) =>
    intake(item.id, { medicationId: item.id, quantity: quantities[index] }),
  );
  assert.equal(countStimulantPills(entries, medications), 2);
  assert.equal(countStimulantPills([], []), 0);
});

test("fractional triple classifications remain independent subsets rather than a partition or rounded icon count", () => {
  const medications = [
    medication("a", {
      categories: ["benzodiazepine", "opioid", "stimulant", "stimulant"],
    }),
  ];
  const entries = [
    intake("tenth", { quantity: 0.1, strengthMg: 1000 }),
    intake("two-tenths", { quantity: 0.2, strengthMg: 0.01 }),
    intake("one-and-a-fraction", { quantity: 1.01 }),
  ];
  assert.deepEqual(countPills(entries, medications), {
    pills: 1.31,
    benzos: 1.31,
  });
  assert.equal(countOpioidPills(entries, medications), 1.31);
  assert.equal(countStimulantPills(entries, medications), 1.31);
});

test("stimulant eligibility follows recorded pill forms and skips pumps, drops, missing metadata and invalid quantities", () => {
  const medications = [
    medication("tablet", { categories: ["stimulant"] }),
    medication("drops", { form: "drops", categories: ["stimulant"] }),
  ];
  const entries = [
    intake("recorded-drops", {
      medicationId: "tablet",
      medicationForm: "drops",
      quantity: 10,
    }),
    intake("recorded-pump", {
      medicationId: "tablet",
      medicationForm: "pump-bottle",
      quantity: 10,
    }),
    intake("legacy-form", {
      medicationId: "tablet",
      medicationForm: undefined,
      quantity: 0.1,
    }),
    intake("recorded-capsule", {
      medicationId: "drops",
      medicationForm: "capsule",
      quantity: 0.2,
    }),
    intake("missing-metadata", {
      medicationId: "missing",
      medicationName: "Stimulant",
      quantity: 4,
    }),
    intake("unknown-form", {
      medicationId: "missing",
      medicationForm: undefined,
      quantity: 7,
    }),
    ...[0, -1, NaN, Infinity].map((quantity, index) =>
      intake(`invalid-stimulant-${index}`, {
        medicationId: "tablet",
        quantity,
      }),
    ),
  ];
  assert.equal(countStimulantPills(entries, medications), 0.3);
  assert.deepEqual(countPills(entries, medications), { pills: 4.3, benzos: 0 });
});

test("stimulant counting keeps first duplicate metadata authoritative without mutating frozen records", () => {
  const entry = Object.freeze(intake("frozen-stimulant", { quantity: 2.5 }));
  const first = Object.freeze(medication("a", { categories: [] }));
  const duplicate = Object.freeze(
    medication("a", { categories: ["stimulant"] }),
  );
  Object.freeze(first.categories);
  Object.freeze(duplicate.categories);
  const entries = Object.freeze([entry]);
  const medications = Object.freeze([first, duplicate]);
  const before = structuredClone({ entries, medications });
  assert.equal(countStimulantPills(entries, medications), 0);
  assert.equal(countStimulantPills(entries, [duplicate, first]), 2.5);
  assert.deepEqual({ entries, medications }, before);
});
