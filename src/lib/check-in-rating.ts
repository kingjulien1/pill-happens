/** Untagged historical ratings use the original five-point scale. */
export type CheckInRatingScale = 5 | 10;

export function isCheckInRating(
  value: unknown,
  scale: unknown = 5,
): value is number | null {
  return (
    (scale === 5 || scale === 10) &&
    (value === null ||
      (typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= scale))
  );
}

/** Display projection only: never replace the original answer or its scale. */
export function checkInRatingForSlider(
  value: number | null,
  scale: CheckInRatingScale = 5,
) {
  if (value === null || !isCheckInRating(value, scale)) return null;
  return scale === 10 ? value : Math.round(1 + ((value - 1) * 9) / 4);
}

/** Preserve the existing comparison unit while comparing both explicit scales. */
export function checkInRatingForComparison(
  value: number | null,
  scale: CheckInRatingScale = 5,
) {
  if (value === null || !isCheckInRating(value, scale)) return null;
  return scale === 5 ? value : 1 + ((value - 1) * 4) / 9;
}
