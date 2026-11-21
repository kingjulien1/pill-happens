import assert from "node:assert/strict";
import test from "node:test";
import { intakeAmountPage } from "./intake-amount-page";

test("paging keeps two shortcuts, reveals three and restores personal choices", () => {
  const shortcuts = [1, 1.5, 1.75, 2, 2.5];
  const initial = intakeAmountPage(shortcuts, 0.25);
  const right = intakeAmountPage(shortcuts, 0.25, initial.nextStart!);
  assert.deepEqual(right.amounts, [2, 2.5, 2.75, 3, 3.25]);
  assert.deepEqual(
    intakeAmountPage(shortcuts, 0.25, right.previousStart!).amounts,
    shortcuts,
  );
  const left = intakeAmountPage(shortcuts, 0.25, initial.previousStart!);
  assert.deepEqual(left.amounts, [0.25, 0.5, 0.75, 1, 1.5]);
  assert.equal(left.previousStart, null);
  assert.deepEqual(
    intakeAmountPage(shortcuts, 0.25, left.nextStart!).amounts,
    shortcuts,
  );
});

test("whole-unit and hundredth pages use the medication step without rounding drift", () => {
  assert.deepEqual(
    intakeAmountPage([1, 2, 3, 4, 5], 1, 3).amounts,
    [4, 5, 6, 7, 8],
  );
  const seed = [0.01, 0.02, 0.03, 0.04, 0.05];
  let page = intakeAmountPage(seed, 0.01);
  assert.equal(page.previousStart, null);
  for (let n = 0; n < 100; n++)
    page = intakeAmountPage(seed, 0.01, page.nextStart!);
  assert.deepEqual(page.amounts, [3.01, 3.02, 3.03, 3.04, 3.05]);
  for (let n = 0; n < 100; n++)
    page = intakeAmountPage(seed, 0.01, page.previousStart!);
  assert.deepEqual(page.amounts, seed);
});

test("range edges stay positive and bounded, with a partial final shift", () => {
  const seed = [9995, 9996, 9997, 9998, 9999];
  const initial = intakeAmountPage(seed, 1);
  const last = intakeAmountPage(seed, 1, initial.nextStart!);
  assert.deepEqual(last.amounts, [9996, 9997, 9998, 9999, 10000]);
  assert.equal(last.nextStart, null);
  const tiny = intakeAmountPage([0.1, 0.5, 1, 2, 3], 1);
  assert.equal(tiny.previousStart, null);
  assert.deepEqual(tiny.amounts, [0.1, 0.5, 1, 2, 3]);
  assert.deepEqual(
    intakeAmountPage(seed, 1, Infinity).amounts,
    initial.amounts,
  );
});

test("sparse or invalid shortcuts never produce invalid amount buttons", () => {
  assert.deepEqual(intakeAmountPage([], 0.25).amounts, []);
  const page = intakeAmountPage([NaN, -1, 0, 10001, 1, 1, 0.001], NaN);
  assert.deepEqual(page.amounts, [1, 1.25, 1.5, 1.75, 2]);
  const upper = intakeAmountPage([10000], 1);
  assert.deepEqual(upper.amounts, [9996, 9997, 9998, 9999, 10000]);
  assert.equal(upper.nextStart, null);
});
