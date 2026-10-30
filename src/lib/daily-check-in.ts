import { dayKey, isValidDayKey, toLocalInput } from "@/lib/domain";

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

/** One personal reflection for a named tracking day, independent of intakes. */
export type DailyCheckIn = {
  day: string;
  note: string;
  moods: DailyMood[];
  energy: number | null;
  stress: number | null;
  sleepHours: number | null;
  helped: string;
  createdAt: string;
  updatedAt: string;
};

export function checkInForDay(
  checkIns: readonly DailyCheckIn[] | undefined,
  day: string,
) {
  return checkIns?.find((checkIn) => checkIn.day === day);
}

/**
 * Evenings continue after midnight until the journal's 06:00 boundary.
 * Past days stay available for a missed reflection; future days never do.
 */
export function canCheckIn(day: string, now: Date, timeZone: string) {
  if (!isValidDayKey(day)) return false;
  const today = dayKey(now, timeZone);
  if (day !== today) return day < today;
  const local = toLocalInput(now, timeZone);
  return local.slice(0, 10) > day || local.slice(11) >= "20:30";
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
