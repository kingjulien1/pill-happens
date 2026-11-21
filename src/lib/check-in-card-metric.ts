import type { SleepAverage } from "./daily-derived-values";
import { morningSleepForDraft, type CheckInDraft } from "./check-in-draft";
import type { DailyCheckIn, DailyCheckInPeriod } from "./daily-check-in";
import { morningSleepDefaults, parseMorningSleepDraft } from "./morning-sleep";

export function getCheckInCardMetric(
  period: DailyCheckInPeriod,
  checkIn?: DailyCheckIn,
  changedDraft?: CheckInDraft,
  average?: SleepAverage,
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
      unit:
        average?.minutes == null
          ? "— avg"
          : `${Math.floor(average.minutes / 60)}h ${String(average.minutes % 60).padStart(2, "0")}m avg`,
      sample: true,
      description:
        average?.minutes == null
          ? "Sample only. No recorded sleep durations are available yet. Nothing has been entered for this check-in."
          : `Sample only: average recorded sleep across ${average.nights} ${average.nights === 1 ? "night" : "nights"}. This value is not an answer and is not saved to this check-in.`,
    };
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return {
    value: String(hours || minutes),
    unit: hours ? (minutes ? `h ${minutes} min` : "h") : "min",
    description: `Recorded sleep: ${hours} h ${minutes} min.`,
  };
}
