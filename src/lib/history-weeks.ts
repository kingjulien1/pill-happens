import { isValidDayKey } from "./domain";

export type HistoryWeek = {
  /** The Monday date stays stable as recorded days are added or removed. */
  id: string;
  start: string;
  end: string;
  weekNumber: number;
  weekYear: number;
  /** Only recorded tracking days, newest first. */
  days: string[];
};

const millisecondsPerWeek = 7 * 86_400_000;

function calendarKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Group already-resolved tracking day keys into Monday–Sunday ISO weeks.
 * UTC dates represent calendar labels here: the journal timezone and 06:00
 * boundary have already been applied, and must not be applied a second time.
 * Missing days and weeks are never filled in; duplicate/invalid keys are ignored.
 */
export function groupHistoryWeeks(days: readonly string[]): HistoryWeek[] {
  const ordered = [...new Set(days.filter(isValidDayKey))].sort().reverse();
  const weeks: HistoryWeek[] = [];

  for (const day of ordered) {
    const start = new Date(`${day}T00:00:00.000Z`);
    const mondayOffset = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - mondayOffset);
    const id = calendarKey(start);
    const current = weeks.at(-1);
    if (current?.id === id) {
      current.days.push(day);
      continue;
    }

    // An ISO week belongs to the year containing its Thursday.
    const thursday = new Date(start);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const weekYear = thursday.getUTCFullYear();
    const yearStart = new Date(thursday);
    yearStart.setUTCMonth(0, 1);
    const weekNumber =
      Math.floor(
        (thursday.getTime() - yearStart.getTime()) / millisecondsPerWeek,
      ) + 1;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    weeks.push({
      id,
      start: id,
      end: calendarKey(end),
      weekNumber,
      weekYear,
      days: [day],
    });
  }

  return weeks;
}

/**
 * Apply the history's recorded-day budget while including the entire boundary
 * week. Increasing that budget keeps a stable prefix and never splits a week.
 */
export function visibleHistoryWeeks(
  weeks: readonly HistoryWeek[],
  dayLimit: number,
): HistoryWeek[] {
  const budget = Math.floor(dayLimit);
  if (!(budget > 0)) return [];
  let dayCount = 0;
  let weekCount = 0;
  for (const week of weeks) {
    if (dayCount >= budget) break;
    dayCount += week.days.length;
    weekCount += 1;
  }
  return weeks.slice(0, weekCount);
}
