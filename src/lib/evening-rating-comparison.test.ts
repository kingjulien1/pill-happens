import assert from "node:assert/strict";
import test from "node:test";
import { getEveningRatingComparison } from "./evening-rating-comparison";

const ratings = {
  energy: 8,
  stress: 4,
  energyScale: 10,
  stressScale: 10,
} as const;

test("compares with the latest earlier rated Evening, excluding Morning and unfilled entries", () => {
  const records = [
    { day: "2026-11-17", energy: 1, stress: 2 },
    {
      day: "2026-11-18",
      period: "evening" as const,
      energy: 7,
      stress: 6,
      energyScale: 10 as const,
      stressScale: 10 as const,
    },
    { day: "2026-11-19", period: "morning" as const, energy: 2, stress: 2 },
    {
      day: "2026-11-19",
      period: "evening" as const,
      energy: null,
      stress: null,
    },
    { day: "2026-11-20", energy: 4, stress: 4 },
    { day: "2026-11-21", energy: 5, stress: 5 },
  ];
  const snapshot = structuredClone(records);
  assert.deepEqual(getEveningRatingComparison("2026-11-20", ratings, records), {
    previousDay: "2026-11-18",
    energy: 1,
    stress: -2,
  });
  assert.deepEqual(records, snapshot);
});

test("legacy and ten-point ratings compare the same values shown by the sliders", () => {
  assert.deepEqual(
    getEveningRatingComparison(
      "2026-11-20",
      { energy: 6, stress: 1, energyScale: 10, stressScale: 10 },
      [{ day: "2026-11-19", energy: 3, stress: 1 }],
    ),
    { previousDay: "2026-11-19", energy: 0, stress: 0 },
  );
  assert.deepEqual(
    getEveningRatingComparison("2026-11-20", { energy: 5, stress: 3 }, [
      {
        day: "2026-11-19",
        energy: 8,
        stress: 8,
        energyScale: 10,
        stressScale: 10,
      },
    ]),
    { previousDay: "2026-11-19", energy: 2, stress: -2 },
  );
});

test("missing or invalid answers do not create inferred changes", () => {
  assert.deepEqual(
    getEveningRatingComparison(
      "2026-11-20",
      { energy: null, stress: 4, stressScale: 10 },
      [{ day: "2026-11-19", energy: 3, stress: null }],
    ),
    { previousDay: "2026-11-19", energy: null, stress: null },
  );
  assert.deepEqual(
    getEveningRatingComparison("2026-11-20", ratings, [
      { day: "not-a-day", energy: 3, stress: 3 },
      {
        day: "2026-11-19",
        energy: 12,
        stress: 15,
        energyScale: 10,
        stressScale: 10,
      },
    ]),
    { previousDay: null, energy: null, stress: null },
  );
});

test("one available comparison is kept while no-history check-ins have a plain scale fallback", () => {
  assert.deepEqual(
    getEveningRatingComparison("2026-11-20", ratings, [
      { day: "2026-11-19", energy: 3, stress: null },
    ]),
    { previousDay: "2026-11-19", energy: 2, stress: null },
  );
  assert.deepEqual(getEveningRatingComparison("2026-11-20", ratings), {
    previousDay: null,
    energy: null,
    stress: null,
  });
});
