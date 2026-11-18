import { morningSleepForDraft, type CheckInDraft } from "./check-in-draft";
import type { DailyCheckIn, DailyCheckInPeriod } from "./daily-check-in";
import { morningSleepDefaults, parseMorningSleepDraft } from "./morning-sleep";

export function getCheckInCardMetric(
  period: DailyCheckInPeriod,
  checkIn?: DailyCheckIn,
  changedDraft?: CheckInDraft,
) {
  if (period === "evening") {
    const count = (changedDraft?.moods ?? checkIn?.moods ?? []).length;
    return {
      value: count ? String(count) : "",
      unit: count ? (count === 1 ? "mood" : "moods") : "Add moods",
      description: `${count} moods selected.`,
    };
  }

  const sleep = changedDraft
    ? morningSleepForDraft(changedDraft, checkIn)
    : morningSleepDefaults(checkIn?.morningSleep, checkIn?.sleepHours);
  // An unfinished answer elsewhere in the form does not hide a valid duration.
  const parsed = parseMorningSleepDraft({
    ...morningSleepDefaults(),
    sleepHours: sleep.sleepHours,
    sleepMinutes: sleep.sleepMinutes,
  });
  const total = parsed.value?.totalSleepMinutes;
  if (total == null)
    return {
      value: "",
      unit: "Add sleep",
      description: "No sleep duration recorded.",
    };
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return {
    value: String(hours || minutes),
    unit: hours ? (minutes ? `h ${minutes} min` : "h") : "min",
    description: `Recorded sleep: ${hours} h ${minutes} min.`,
  };
}
