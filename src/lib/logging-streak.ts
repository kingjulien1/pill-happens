import { dayKey, isValidDayKey, type AppData } from "@/lib/domain";

const earlyMilestones = [2, 3, 4, 5, 7, 10, 13, 15, 17, 20, 25, 30] as const;
const millisecondsPerDay = 86_400_000;
const isoTimestamp =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

export function streakMilestone(count: number): {
  reached: number | null;
  next: number;
} {
  const days = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (days >= 30) {
    const reached = Math.floor(days / 5) * 5;
    return { reached, next: reached + 5 };
  }
  let reached: number | null = null;
  for (const milestone of earlyMilestones) {
    if (milestone > days) return { reached, next: milestone };
    reached = milestone;
  }
  return { reached, next: 35 };
}

/**
 * Consecutive tracking days with at least one recorded entry. This measures
 * logging activity, without making claims about dose goals or complete records.
 * Pass the current instant to also ignore future times within today's day.
 */
export function loggingStreak(
  data: Pick<AppData, "intakes" | "settings">,
  today: string,
  now?: Date,
): {
  current: number;
  best: number;
  totalDays: number;
  loggedToday: boolean;
  milestone: number | null;
  nextMilestone: number;
} {
  if (!isValidDayKey(today)) throw new RangeError("Invalid tracking day.");
  const upperTimestamp = now?.getTime();
  if (upperTimestamp !== undefined && !Number.isFinite(upperTimestamp)) {
    throw new RangeError("Invalid current time.");
  }

  const loggedDays = new Set<string>();
  for (const intake of data.intakes) {
    const match = isoTimestamp.exec(intake.takenAt);
    if (!match || !isValidDayKey(match[1])) continue;
    const timestamp = Date.parse(intake.takenAt);
    if (
      !Number.isFinite(timestamp) ||
      (upperTimestamp !== undefined && timestamp > upperTimestamp)
    ) {
      continue;
    }
    try {
      const key = dayKey(new Date(timestamp), data.settings.timezone);
      if (isValidDayKey(key) && key <= today) loggedDays.add(key);
    } catch {
      // Invalid stored timestamps never interrupt the rest of the journal.
    }
  }

  // UTC ordinals here represent calendar labels, not elapsed intake hours.
  // The timezone and 06:00 boundary have already been applied by dayKey.
  const ordinal = (key: string) =>
    Date.parse(`${key}T00:00:00.000Z`) / millisecondsPerDay;
  const days = [...loggedDays].sort().map(ordinal);
  let best = 0;
  let run = 0;
  let previous: number | undefined;
  for (const day of days) {
    run = previous !== undefined && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  const loggedToday = loggedDays.has(today);
  let expected = ordinal(today) - (loggedToday ? 0 : 1);
  let current = 0;
  for (let index = days.length - 1; index >= 0; index--) {
    if (days[index] !== expected) break;
    current += 1;
    expected -= 1;
  }

  const { reached, next } = streakMilestone(current);
  return {
    current,
    best,
    totalDays: loggedDays.size,
    loggedToday,
    milestone: reached,
    nextMilestone: next,
  };
}
