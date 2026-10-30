import assert from "node:assert/strict";
import test from "node:test";
import {
  MEDICATION_CATEGORIES,
  MEDICATION_CATEGORY_VALUES,
  filterMedicationCategories,
  getMedicationCategories,
  getMedicationCategory,
  medicationCategoryFlags,
  normalizeMedicationCategories,
  type MedicationCategory,
} from "./medication-categories";
import {
  getMedicationClasses,
  getMedicationClassification,
} from "./medication-classification";

test("category registry has stable unique IDs, labels and all requested choices", () => {
  assert.equal(
    new Set(MEDICATION_CATEGORY_VALUES).size,
    MEDICATION_CATEGORIES.length,
  );
  for (const category of [
    "benzodiazepine",
    "opioid",
    "antidepressant",
    "antipsychotic",
    "sleep-aid",
    "stimulant",
    "supplement",
  ] as const) {
    assert.ok(MEDICATION_CATEGORY_VALUES.includes(category));
    assert.equal(getMedicationCategory(category).value, category);
  }
  for (const item of MEDICATION_CATEGORIES) {
    assert.match(item.value, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(item.label && item.shortLabel && item.aliases.length);
  }
});

test("legacy flags remain manual and fill categories only when no array is present", () => {
  assert.deepEqual(getMedicationCategories(), []);
  assert.deepEqual(getMedicationCategories(null), []);
  assert.deepEqual(
    getMedicationCategories({ isBenzodiazepine: true, isOpioid: true }),
    ["benzodiazepine", "opioid"],
  );
  assert.deepEqual(
    getMedicationCategories({ isBenzodiazepine: false, isOpioid: true }),
    ["opioid"],
  );
  for (const invalid of ["true", 1, [], {}]) {
    assert.deepEqual(
      getMedicationCategories({
        isBenzodiazepine: invalid as unknown as boolean,
      }),
      [],
    );
  }
  assert.deepEqual(
    getMedicationCategories({
      categories: [],
      isBenzodiazepine: true,
      isOpioid: true,
    }),
    [],
  );
});

test("explicit categories normalize without mutation and never resurrect stale priority flags", () => {
  const input: MedicationCategory[] = [
    "sleep-aid",
    "opioid",
    "antidepressant",
    "sleep-aid",
  ];
  const original = [...input];
  const normalized = normalizeMedicationCategories(input);
  assert.deepEqual(normalized, ["opioid", "antidepressant", "sleep-aid"]);
  assert.deepEqual(input, original);
  normalized.pop();
  assert.deepEqual(getMedicationCategories({ categories: input }), [
    "opioid",
    "antidepressant",
    "sleep-aid",
  ]);
  const explicit = {
    categories: ["sleep-aid"] as MedicationCategory[],
    isBenzodiazepine: true,
    isOpioid: true,
  };
  assert.deepEqual(getMedicationClasses(explicit), []);
  assert.equal(getMedicationClassification(explicit), "unmarked");
  assert.deepEqual(
    normalizeMedicationCategories(["unknown" as MedicationCategory]),
    [],
  );
});

test("only selected priority classes drive the existing colored highlights", () => {
  const categories: MedicationCategory[] = [
    "benzodiazepine",
    "opioid",
    "sleep-aid",
    "supplement",
  ];
  assert.deepEqual(medicationCategoryFlags(categories), {
    isBenzodiazepine: true,
    isOpioid: true,
  });
  assert.deepEqual(getMedicationClasses({ categories }), [
    "benzodiazepine",
    "opioid",
  ]);
  assert.equal(getMedicationClassification({ categories }), "both");
  assert.deepEqual(medicationCategoryFlags(["antidepressant", "stimulant"]), {
    isBenzodiazepine: false,
    isOpioid: false,
  });
});

test("category search matches English/German labels, IDs, aliases and multiple words", () => {
  const values = (query: string) =>
    filterMedicationCategories(query).map((item) => item.value);
  assert.deepEqual(values("ANTI-DEPRESSIVA"), ["antidepressant"]);
  assert.deepEqual(values("Schlaftabletten"), ["sleep-aid"]);
  assert.deepEqual(values("sleeping pills"), ["sleep-aid"]);
  assert.deepEqual(values("general supplements"), ["supplement"]);
  assert.deepEqual(values("Nahrungsergänzung"), ["supplement"]);
  assert.deepEqual(values("blood pressure"), ["cardiovascular"]);
  assert.deepEqual(values("opiate"), ["opioid"]);
  assert.deepEqual(values("antipsychotic"), ["antipsychotic"]);
  assert.deepEqual(values("does-not-exist"), []);
  assert.equal(values("  ").length, MEDICATION_CATEGORIES.length);
});
