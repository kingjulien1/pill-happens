import assert from "node:assert/strict";
import test from "node:test";
import {
  getMedicationType,
  isMeteredMedicationType,
  medicationQuantityControls,
} from "./medication-types";

test("both dispenser presentations count actuations like legacy metered pumps", () => {
  for (const type of ["pump", "pump-bottle", "gel-dispenser"] as const) {
    assert.equal(isMeteredMedicationType(type), true);
    assert.equal(getMedicationType(type).unit, "pump");
    assert.equal(getMedicationType(type).units, "pumps");
    assert.deepEqual(medicationQuantityControls(type), {
      increment: 1,
      presets: [1, 2, 3, 4],
    });
  }
});

test("tablet quantities keep fractional controls and unknown legacy units stay generic", () => {
  for (const type of [
    "tablet",
    "capsule",
    "drops",
    "other",
    undefined,
  ] as const) {
    assert.equal(isMeteredMedicationType(type), false);
    assert.deepEqual(medicationQuantityControls(type), {
      increment: 0.25,
      presets: [0.25, 0.5, 1, 2],
    });
  }
  assert.equal(getMedicationType().units, "units");
});

test("named journal medications choose their recording controls independently of strength", () => {
  assert.deepEqual(medicationQuantityControls("capsule", "Iserlohn 50 mg"), {
    increment: 0.01,
    presets: [0.01, 0.02, 0.03, 0.04],
  });
  for (const name of [
    "Tadalafil",
    "VIAGRA 50mg",
    "Desloratadin",
    "Venlafaxin",
    "Levomethasan",
    "Tramal",
  ]) {
    assert.deepEqual(medicationQuantityControls("tablet", name), {
      increment: 1,
      presets: [1, 2, 3, 4],
    });
  }
});
