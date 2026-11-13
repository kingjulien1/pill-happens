import type { MorningSleep } from "./morning-sleep";
import type { CheckInRatingScale } from "./check-in-rating";
import { dayKey, isValidDayKey, toLocalInput } from "@/lib/domain";

/** Shared by the reflection editor and API; other check-in fields stay concise. */
export const DAILY_REFLECTION_MAX_LENGTH = 100_000;

export const DAILY_MOODS = [
  { value: "calm", label: "Calm", emoji: "🌿" },
  { value: "okay", label: "Okay", emoji: "🙂" },
  { value: "hopeful", label: "Hopeful", emoji: "🌤️" },
  { value: "happy", label: "Happy", emoji: "✨" },
  { value: "tired", label: "Tired", emoji: "🥱" },
  { value: "anxious", label: "Anxious", emoji: "🌀" },
  { value: "low", label: "Low", emoji: "🌧️" },
  { value: "restless", label: "Restless", emoji: "〰️" },
  { value: "irritable", label: "Irritable", emoji: "🌶️" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "🌊" },
] as const;

export type DailyMood = (typeof DAILY_MOODS)[number]["value"];
export const DAILY_MOOD_VALUES = DAILY_MOODS.map((mood) => mood.value);
export const DAILY_CHECK_IN_PERIODS = ["morning", "evening"] as const;
export type DailyCheckInPeriod = (typeof DAILY_CHECK_IN_PERIODS)[number];

/** One personal reflection for a tracking day and period, independent of intakes. */
export type DailyCheckIn = {
  day: string;
  /** Omitted by legacy Evening records; new saves always specify the period. */
  period?: DailyCheckInPeriod;
  note: string;
  moods: DailyMood[];
  energy: number | null;
  stress: number | null;
  /** Untagged historical ratings retain their original five-point meaning. */
  energyScale?: CheckInRatingScale;
  stressScale?: CheckInRatingScale;
  sleepHours: number | null;
  /** Present only for Morning; absent on legacy records and Evening. */
  morningSleep?: MorningSleep | null;
  /** Evening's intended bedtime for this day; absent on earlier records. */
  bedtime?: string | null;
  helped: string;
  createdAt: string;
  updatedAt: string;
};

export function getCheckInPeriod(checkIn: Pick<DailyCheckIn, "period">) {
  return checkIn.period ?? "evening";
}

export function checkInForDay(
  checkIns: readonly DailyCheckIn[] | undefined,
  day: string,
  period: DailyCheckInPeriod = "evening",
) {
  return checkIns?.find(
    (checkIn) => checkIn.day === day && getCheckInPeriod(checkIn) === period,
  );
}

/**
 * Morning is available for the entire tracking day, beginning at 06:00.
 * Evening becomes available at 17:00 in the journal timezone.
 * Evenings continue after midnight until the journal's 06:00 boundary.
 * Past days stay available for a missed reflection; future days never do.
 */
export function canCheckIn(
  day: string,
  now: Date,
  timeZone: string,
  period: DailyCheckInPeriod = "evening",
) {
  if (!isValidDayKey(day)) return false;
  const today = dayKey(now, timeZone);
  if (day !== today) return day < today;
  if (period === "morning") return true;
  const local = toLocalInput(now, timeZone);
  return local.slice(0, 10) > day || local.slice(11) >= "17:00";
}

/** Include reflection-only days in history, without counting them as intakes. */
export function journalDays(
  intakes: readonly { takenAt: string }[],
  checkIns: readonly DailyCheckIn[] | undefined,
  timeZone: string,
) {
  return [
    ...new Set([
      ...intakes.map((intake) => dayKey(intake.takenAt, timeZone)),
      ...(checkIns ?? []).map((checkIn) => checkIn.day).filter(isValidDayKey),
    ]),
  ].sort((a, b) => b.localeCompare(a));
}
