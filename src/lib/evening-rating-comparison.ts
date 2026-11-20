import { getCheckInPeriod, type DailyCheckIn } from "./daily-check-in";
import {
  checkInRatingForSlider,
  type CheckInRatingScale,
} from "./check-in-rating";
import { isValidDayKey } from "./domain";

type RatingAnswers = Pick<
  DailyCheckIn,
  "energy" | "stress" | "energyScale" | "stressScale"
>;
type RatedCheckIn = RatingAnswers & Pick<DailyCheckIn, "day" | "period">;

function difference(
  current: number | null,
  before: number | null,
  currentScale?: CheckInRatingScale,
  beforeScale?: CheckInRatingScale,
) {
  const displayedCurrent = checkInRatingForSlider(current, currentScale);
  const displayedBefore = checkInRatingForSlider(before, beforeScale);
  return displayedCurrent === null || displayedBefore === null
    ? null
    : displayedCurrent - displayedBefore;
}

/** Compare the same displayed 1–10 values shown by the two sliders. */
export function getEveningRatingComparison(
  day: string,
  current: RatingAnswers,
  checkIns: readonly RatedCheckIn[] = [],
) {
  const previous = checkIns
    .filter(
      (entry) =>
        isValidDayKey(entry.day) &&
        entry.day < day &&
        getCheckInPeriod(entry) === "evening" &&
        (checkInRatingForSlider(entry.energy, entry.energyScale) !== null ||
          checkInRatingForSlider(entry.stress, entry.stressScale) !== null),
    )
    .sort((left, right) => right.day.localeCompare(left.day))[0];
  return {
    previousDay: previous?.day ?? null,
    energy: previous
      ? difference(
          current.energy,
          previous.energy,
          current.energyScale,
          previous.energyScale,
        )
      : null,
    stress: previous
      ? difference(
          current.stress,
          previous.stress,
          current.stressScale,
          previous.stressScale,
        )
      : null,
  };
}
