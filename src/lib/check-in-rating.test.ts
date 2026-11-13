import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInRatingForComparison,
  checkInRatingForSlider,
  isCheckInRating,
} from "./check-in-rating";

test("ratings require explicit ten-point metadata before accepting values above five", () => {
  for (const value of [1, 2, 3, 4, 5]) assert.ok(isCheckInRating(value));
  for (const value of [6, 7, 8, 9, 10]) {
    assert.equal(isCheckInRating(value), false);
    assert.ok(isCheckInRating(value, 10));
  }
  for (const scale of [5, 10]) {
    assert.ok(isCheckInRating(null, scale));
    for (const value of [0, -1, 11, 1.5, NaN, Infinity, "5", undefined])
      assert.equal(isCheckInRating(value, scale), false);
  }
  for (const scale of [0, 1, 9, 11, "10", null])
    assert.equal(isCheckInRating(1, scale), false);
});

test("legacy slider projection retains endpoints without reinterpreting the stored number", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((value) => checkInRatingForSlider(value)),
    [1, 3, 6, 8, 10],
  );
  for (let value = 1; value <= 10; value++)
    assert.equal(checkInRatingForSlider(value, 10), value);
  assert.equal(checkInRatingForSlider(null), null);
  assert.equal(checkInRatingForSlider(6), null);
});

test("mixed-scale comparisons share one continuous five-point unit", () => {
  assert.equal(checkInRatingForComparison(1, 10), 1);
  assert.equal(checkInRatingForComparison(10, 10), 5);
  for (let value = 1; value <= 5; value++)
    assert.equal(checkInRatingForComparison(value), value);
  assert.equal(checkInRatingForComparison(null, 10), null);
  assert.equal(checkInRatingForComparison(10), null);
  assert.ok(Math.abs(checkInRatingForComparison(6, 10)! - 29 / 9) < 1e-12);
});
