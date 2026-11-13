import assert from "node:assert/strict";
import test from "node:test";
import type { Intake, Medication } from "./domain";
import {
  medicationKitPalette,
  medicationKitPreview,
} from "./medication-kit-preview";

function medication(id: string, fields: Partial<Medication> = {}): Medication {
  return {
    id,
    name: `Medication ${id}`,
    strengthMg: 10,
    form: "tablet",
    color: "blue",
    archived: false,
    createdAt: "2026-01-01T12:00:00Z",
    ...fields,
  };
}

function intake(medicationId: string, fields: Partial<Intake> = {}): Intake {
  return {
    id: `${medicationId}-record`,
    medicationId,
    medicationName: "Recorded snapshot",
    medicationForm: "tablet",
    strengthMg: 10,
    quantity: 1,
    takenAt: "2026-10-01T12:00:00Z",
    createdAt: "2026-10-01T12:00:00Z",
    note: "",
    ...fields,
  };
}

const ids = (medications: Medication[]) => medications.map(({ id }) => id);

test("empty or small libraries return only real unique saved medications", () => {
  const one = medication("one");
  const two = medication("two");
  assert.deepEqual(medicationKitPreview([], [intake("missing")]), []);
  assert.deepEqual(medicationKitPreview([one], []), [one]);
  assert.deepEqual(medicationKitPreview([one, two, one], []), [one, two]);
});

test("manually marked Benzos take priority over more frequently logged other medications", () => {
  const meds = [
    medication("popular"),
    medication("less-used-benzo", { categories: ["benzodiazepine"] }),
    medication("unused-benzo", { isBenzodiazepine: true }),
    medication("other"),
  ];
  const records = [
    intake("popular"),
    intake("popular"),
    intake("popular"),
    intake("other"),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), [
    "less-used-benzo",
    "unused-benzo",
    "popular",
  ]);
});

test("Benzo ranking uses record frequency and caps the cluster at three", () => {
  const meds = ["a", "b", "c", "d"].map((id) =>
    medication(id, { categories: ["benzodiazepine"] }),
  );
  const records = [
    intake("b"),
    intake("c"),
    intake("c"),
    intake("d"),
    intake("d"),
    intake("d"),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), ["d", "c", "b"]);
});

test("frequency counts intake records rather than quantity, dose, or dosage form", () => {
  const meds = [
    medication("large-dose"),
    medication("fractional"),
    medication("drops", { form: "drops" }),
    medication("unused"),
  ];
  const records = [
    intake("large-dose", { quantity: 1000, strengthMg: 1000 }),
    intake("fractional", { quantity: 0.25, strengthMg: 0.1 }),
    intake("fractional", { quantity: 0.25, strengthMg: 0.1 }),
    intake("drops", { medicationForm: "drops" }),
    intake("drops", { medicationForm: "drops" }),
    intake("drops", { medicationForm: "drops" }),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), [
    "drops",
    "fractional",
    "large-dose",
  ]);
});

test("explicit categories override stale flags and names never infer classification", () => {
  const meds = [
    medication("cleared", { categories: [], isBenzodiazepine: true }),
    medication("opioid-only", {
      categories: ["opioid"],
      isBenzodiazepine: true,
    }),
    medication("named", { name: "Benzodiazepine example" }),
    medication("dual", { categories: ["opioid", "benzodiazepine"] }),
    medication("legacy", { isBenzodiazepine: true }),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, [])), [
    "dual",
    "legacy",
    "cleared",
  ]);
});

test("archived saved medication and all journal dates remain eligible", () => {
  const meds = [
    medication("unused"),
    medication("archived", { archived: true }),
    medication("old"),
    medication("future"),
  ];
  const records = [
    intake("archived"),
    intake("archived"),
    intake("old", { takenAt: "2000-01-01T12:00:00Z" }),
    intake("future", { takenAt: "2099-01-01T12:00:00Z" }),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), [
    "archived",
    "future",
    "old",
  ]);
});

test("latest valid takenAt breaks frequency ties before original library order", () => {
  const meds = [
    medication("first"),
    medication("newer"),
    medication("same-time"),
    medication("unused"),
  ];
  const records = [
    intake("first", {
      takenAt: "2026-10-01T12:00:00Z",
      createdAt: "2099-01-01T12:00:00Z",
    }),
    intake("newer", { takenAt: "2026-10-02T12:00:00Z" }),
    intake("same-time", { takenAt: "2026-10-02T14:00:00+02:00" }),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), [
    "newer",
    "same-time",
    "first",
  ]);
  assert.deepEqual(ids(medicationKitPreview(meds, [...records].reverse())), [
    "newer",
    "same-time",
    "first",
  ]);
});

test("invalid timestamps cannot poison recency or discard recorded frequency", () => {
  const meds = [
    medication("invalid"),
    medication("valid"),
    medication("twice"),
    medication("unused"),
  ];
  const records = [
    intake("invalid", { takenAt: "invalid" }),
    intake("valid"),
    intake("twice", { takenAt: "" }),
    intake("twice", { takenAt: "invalid" }),
  ];
  assert.deepEqual(ids(medicationKitPreview(meds, records)), [
    "twice",
    "valid",
    "invalid",
  ]);
});

test("orphans are ignored, duplicate IDs use the first metadata, and input objects are untouched", () => {
  const original = medication("first", {
    icon: "leaf",
    iconRotation: 45,
    color: "rose",
  });
  const duplicate = medication("first", {
    categories: ["benzodiazepine"],
    icon: "sun",
  });
  const meds = [
    original,
    duplicate,
    medication("second"),
    medication("third"),
    medication("fourth"),
  ];
  const records = [intake("missing"), intake("missing"), intake("second")];
  const before = structuredClone({ meds, records });
  const result = medicationKitPreview(meds, records);
  assert.deepEqual(ids(result), ["second", "first", "third"]);
  assert.equal(result[1], original);
  assert.deepEqual({ meds, records }, before);
});

test("palette skips repeated pigments before taking six saved colors", () => {
  const meds = [
    medication("first", { color: "rose", categories: ["benzodiazepine"] }),
    medication("duplicate", { color: "rose" }),
    medication("fallback", {
      color: "unknown-legacy-color" as Medication["color"],
    }),
    ...(["ruby", "orange", "honey", "violet", "mint", "blue"] as const).map(
      (color) => medication(color, { color }),
    ),
  ];
  assert.deepEqual(
    medicationKitPalette(meds, []).map(({ value }) => value),
    ["rose", "ruby", "orange", "honey", "violet", "mint"],
  );
  assert.equal(
    new Set(medicationKitPalette(meds, []).map(({ hex }) => hex)).size,
    6,
  );
});

test("palette keeps ranking and archived pigments without inventing missing colors", () => {
  assert.deepEqual(medicationKitPalette([], []), []);
  const meds = [
    medication("ordinary", { color: "blue" }),
    medication("archived-benzo", {
      color: "ruby",
      archived: true,
      categories: ["benzodiazepine"],
    }),
    medication("popular", { color: "mint" }),
  ];
  const before = structuredClone(meds);
  assert.deepEqual(
    medicationKitPalette(meds, [intake("popular"), intake("popular")]).map(
      ({ value }) => value,
    ),
    ["ruby", "mint", "blue"],
  );
  assert.deepEqual(
    medicationKitPalette([meds[0]], []).map(({ value }) => value),
    ["blue"],
  );
  assert.deepEqual(meds, before);
});
