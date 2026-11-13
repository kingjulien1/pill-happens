import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_INTAKE_QUANTITY,
  MIN_EDITABLE_INTAKE_QUANTITY,
  MIN_INTAKE_QUANTITY,
  hasIntakeQuantityEditorPrecisionLoss,
  limitIntakeQuantityInput,
  normalizeIntakeQuantityForEditor,
  parseIntakeQuantity,
  stepEditableIntakeQuantity,
  stepIntakeQuantity,
} from "./intake-quantity";

test("comma and dot are decimal marks, without treating either as grouping", () => {
  for (const [raw, expected] of [
    ["1", 1],
    ["1.5", 1.5],
    ["1,5", 1.5],
    [".5", 0.5],
    [",5", 0.5],
    ["1.", 1],
    ["1,", 1],
    [" 0001,50 ", 1.5],
    ["1,234", 1.234],
    ["0", 0],
    ["0,000001", MIN_INTAKE_QUANTITY],
    ["10000", MAX_INTAKE_QUANTITY],
    ["0.0000001", 0.0000001],
    ["10001", 10001],
  ] as const)
    assert.equal(parseIntakeQuantity(raw), expected, raw);
});

test("unfinished controls and ambiguous or non-decimal syntax stay invalid without coercion", () => {
  for (const raw of [
    "",
    " ",
    ",",
    ".",
    "1,2.3",
    "1.2,3",
    "1,000,000",
    "1.000.000",
    "1 000",
    "1_000",
    "1e2",
    "1E-6",
    "+1",
    "-1",
    "NaN",
    "Infinity",
    "0x10",
    "1/2",
    "12mg",
    "1\n2",
    "1".repeat(257),
  ]) {
    assert.equal(parseIntakeQuantity(raw), null, raw);
    assert.equal(stepIntakeQuantity(raw, 0.25), null, raw);
  }
});

test("fractional input stays legal with both fractional and whole-unit step controls", () => {
  assert.equal(stepIntakeQuantity("0,1", 0.25), "0.35");
  assert.equal(stepIntakeQuantity("0.1", 1), "1.1");
  assert.equal(stepIntakeQuantity("1,25", -1), "0.25");
  assert.equal(
    stepIntakeQuantity("0.333333333333333333", 1),
    "1.333333333333333333",
  );
  assert.equal(stepIntakeQuantity("0001,5000", 0), "1.5");
});

test("repeated decimal steps do not accumulate binary floating-point artifacts", () => {
  let quantity = "0.1";
  for (let index = 0; index < 10; index += 1)
    quantity = stepIntakeQuantity(quantity, 0.1)!;
  assert.equal(quantity, "1.1");
  for (let index = 0; index < 10; index += 1)
    quantity = stepIntakeQuantity(quantity, -0.1)!;
  assert.equal(quantity, "0.1");
  assert.equal(stepIntakeQuantity("0.000001", 0.000001), "0.000002");
  assert.equal(stepIntakeQuantity("0.000001", 1e-7), "0.0000011");
});

test("steps clamp safely at the quantity boundaries instead of zero or an increment grid", () => {
  assert.equal(stepIntakeQuantity("0.1", -1), "0.000001");
  assert.equal(stepIntakeQuantity("0.000001", -0.25), "0.000001");
  assert.equal(stepIntakeQuantity("0", -1), "0.000001");
  assert.equal(stepIntakeQuantity("9999,9", 1), "10000");
  assert.equal(stepIntakeQuantity("10000", 0.25), "10000");
  assert.equal(stepIntakeQuantity("1", Number.MAX_VALUE), "10000");
  for (const delta of [NaN, Infinity, -Infinity])
    assert.equal(stepIntakeQuantity("1", delta), null);
});

test("editor input accepts hundredths with comma or dot for every step setting", () => {
  for (const [raw, expected] of [
    ["", ""],
    [" ", ""],
    [".", "."],
    [",", ","],
    ["1.", "1."],
    ["1,", "1,"],
    [".01", ".01"],
    [",01", ",01"],
    ["0001,50", "0001,50"],
    [" 1.25 ", "1.25"],
    ["0.759", "0.75"],
    ["0,759", "0,75"],
    ["1.999999999", "1.99"],
    ["10000.01", "10000.01"],
  ])
    assert.equal(limitIntakeQuantityInput(raw), expected, raw);

  // Whole-pump/drop steps do not impose a whole-number validity grid.
  assert.equal(stepEditableIntakeQuantity("0,01", 1), "1.01");
  assert.equal(stepEditableIntakeQuantity("0.01", 0.25), "0.26");
});

test("editor rejects non-decimal paste instead of silently changing its meaning", () => {
  for (const raw of [
    "1e2",
    "1E-6",
    "1,2.3",
    "1,000,000",
    "1 000",
    "0x10",
    "+1",
    "-1",
    "12mg",
    "1/2",
    "1\n2",
    "NaN",
    "Infinity",
    "1".repeat(257),
  ]) {
    assert.equal(limitIntakeQuantityInput(raw), null, raw);
    assert.equal(normalizeIntakeQuantityForEditor(raw), null, raw);
  }
});

test("legacy and medication defaults display rounded hundredths without changing existing precision", () => {
  for (const [raw, expected] of [
    ["0.333333333333333333", "0.33"],
    ["0,335", "0,34"],
    ["1.005", "1.01"],
    ["1.999999999999999999", "2"],
    ["0001,5000", "1,5"],
    ["2.675", "2.68"],
    ["9999.999999999", "10000"],
    ["10000.999", "10001"],
    ["", ""],
    [",", ","],
    ["1,", "1,"],
    ["01.20", "01.20"],
  ])
    assert.equal(normalizeIntakeQuantityForEditor(raw), expected, raw);

  // The old parser and record/draft model retain the original value.
  const legacy = "0.333333333333333333";
  assert.equal(parseIntakeQuantity(legacy), Number(legacy));
  assert.equal(stepIntakeQuantity(legacy, 1), "1.333333333333333333");
});

test("unrepresentably small defaults never silently become a larger taken amount", () => {
  for (const raw of ["0.000001", "0,000001", "0.004999999999999"])
    assert.equal(normalizeIntakeQuantityForEditor(raw), "0", raw);
  assert.equal(normalizeIntakeQuantityForEditor("0.005"), "0.01");
  assert.equal(parseIntakeQuantity("0.000001"), MIN_INTAKE_QUANTITY);
  assert.equal(MIN_EDITABLE_INTAKE_QUANTITY, 0.01);
});

test("precision warnings identify changed values without treating formatting as a changed dose", () => {
  for (const raw of ["0.333333", "0,335", "0.000001", "9999.999"])
    assert.equal(hasIntakeQuantityEditorPrecisionLoss(raw), true, raw);
  for (const raw of ["1.2300", "0001,5000", "0", ".00", "", ",", "1e2"])
    assert.equal(hasIntakeQuantityEditorPrecisionLoss(raw), false, raw);
});

test("editor steps use hundredth bounds and retain fractions with full-unit steps", () => {
  assert.equal(stepEditableIntakeQuantity("0.5", 1), "1.5");
  assert.equal(stepEditableIntakeQuantity("1,25", -1), "0.25");
  assert.equal(stepEditableIntakeQuantity("0.01", -0.25), "0.01");
  assert.equal(stepEditableIntakeQuantity("0.1", -1), "0.01");
  assert.equal(stepEditableIntakeQuantity("9999.99", 1), "10000");
  assert.equal(stepEditableIntakeQuantity("10000", 0.25), "10000");
  assert.equal(stepEditableIntakeQuantity("1", Number.MAX_VALUE), "10000");
  assert.equal(stepEditableIntakeQuantity("0.33", 0.005), "0.34");
  // An explicit edit adopts the visible value before applying its increment.
  assert.equal(stepEditableIntakeQuantity("0.335", 0.005), "0.35");
  for (const raw of ["", ",", ".", "1e2", "0,1.2"])
    assert.equal(stepEditableIntakeQuantity(raw, 1), null, raw);
  for (const delta of [NaN, Infinity, -Infinity])
    assert.equal(stepEditableIntakeQuantity("1", delta), null);
});

test("repeated editor steps do not drift or produce more than two fraction digits", () => {
  let quantity = "0.01";
  for (let index = 0; index < 100; index += 1) {
    quantity = stepEditableIntakeQuantity(quantity, 0.1)!;
    assert.match(quantity, /^\d+(?:\.\d{1,2})?$/);
  }
  assert.equal(quantity, "10.01");
  for (let index = 0; index < 100; index += 1) {
    quantity = stepEditableIntakeQuantity(quantity, -0.1)!;
    assert.match(quantity, /^\d+(?:\.\d{1,2})?$/);
  }
  assert.equal(quantity, "0.01");
});
