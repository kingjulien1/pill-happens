import assert from "node:assert/strict";
import test from "node:test";
import {
  getMedicationClasses,
  getMedicationClassification,
  medicationClassificationFlags,
  type MedicationClassification,
} from "./medication-classification";

test("manual medication labels distinguish legacy, benzo, opioid and combined flags", () => {
  assert.equal(getMedicationClassification(), "unmarked");
  assert.equal(getMedicationClassification(null), "unmarked");
  for (const benzo of [undefined, false, true]) {
    for (const opioid of [undefined, false, true]) {
      const medication = { isBenzodiazepine: benzo, isOpioid: opioid };
      assert.equal(
        getMedicationClassification(medication),
        benzo === true
          ? opioid === true
            ? "both"
            : "benzodiazepine"
          : opioid === true
            ? "opioid"
            : "unmarked",
      );
    }
  }
});

test("only literal true flags classify medication metadata", () => {
  for (const value of ["true", "false", 1, 0, [], {}, null]) {
    const malformed = value as unknown as boolean;
    assert.equal(
      getMedicationClassification({
        isBenzodiazepine: malformed,
        isOpioid: malformed,
      }),
      "unmarked",
    );
    assert.deepEqual(
      getMedicationClasses({
        isBenzodiazepine: malformed,
        isOpioid: malformed,
      }),
      [],
    );
  }
  const named = {
    name: "Diazepam and Tramadol",
    activeIngredient: "Benzodiazepine opioid",
    isOpioid: undefined,
  };
  assert.equal(getMedicationClassification({ ...named }), "unmarked");
});

test("classification selections round-trip and explicitly clear unselected labels", () => {
  const selections: MedicationClassification[] = [
    "unmarked",
    "benzodiazepine",
    "opioid",
    "both",
  ];
  for (const selected of selections) {
    const flags = medicationClassificationFlags(selected);
    assert.equal(getMedicationClassification(flags), selected);
    assert.equal(
      flags.isBenzodiazepine,
      selected === "benzodiazepine" || selected === "both",
    );
    assert.equal(flags.isOpioid, selected === "opioid" || selected === "both");
    const previous = { isBenzodiazepine: true, isOpioid: true };
    assert.equal(
      getMedicationClassification(Object.assign(previous, flags)),
      selected,
    );
  }
  const first = medicationClassificationFlags("both");
  first.isOpioid = false;
  assert.deepEqual(medicationClassificationFlags("both"), {
    isBenzodiazepine: true,
    isOpioid: true,
  });
});

test("combined medication classes stay benzo-first without mutating the source", () => {
  const medication = { isBenzodiazepine: true, isOpioid: true };
  const before = structuredClone(medication);
  const classes = getMedicationClasses(medication);
  assert.deepEqual(classes, ["benzodiazepine", "opioid"]);
  classes.pop();
  assert.deepEqual(getMedicationClasses(medication), [
    "benzodiazepine",
    "opioid",
  ]);
  assert.deepEqual(getMedicationClasses({ isOpioid: true }), ["opioid"]);
  assert.deepEqual(getMedicationClasses({ isBenzodiazepine: true }), [
    "benzodiazepine",
  ]);
  assert.deepEqual(getMedicationClasses(), []);
  assert.deepEqual(medication, before);
});
