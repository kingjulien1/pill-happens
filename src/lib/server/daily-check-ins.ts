import { dayKey, type AppData } from "@/lib/domain";
import { getCheckInPeriod, type DailyCheckIn } from "@/lib/daily-check-in";
import type { DailyCheckInInput } from "./validation";

export const DAILY_CHECK_IN_LIMIT = 50_000;

export class DailyCheckInSaveError extends Error {}

/**
 * Apply inside the journal's atomic mutation. The caller captures `now` once,
 * outside the retry callback, so contention never changes its saved timestamp.
 */
export function upsertDailyCheckIn(
  state: AppData,
  input: DailyCheckInInput,
  now: Date,
) {
  if (input.day > dayKey(now, state.settings.timezone))
    throw new DailyCheckInSaveError(
      "A check-in cannot be saved for a future tracking day.",
    );

  const checkIns = state.dailyCheckIns ?? [];
  const matches = (entry: DailyCheckIn) =>
    entry.day === input.day && getCheckInPeriod(entry) === input.period;
  const existing = checkIns.find(matches);
  if (!existing && checkIns.length >= DAILY_CHECK_IN_LIMIT)
    throw new DailyCheckInSaveError(
      "Your journal has reached its check-in limit. Export a backup before continuing.",
    );

  const timestamp = now.toISOString();
  const saved: DailyCheckIn = {
    ...input,
    // An older full-form client cannot clear a newer Evening bedtime by omission.
    ...(input.period === "evening" &&
    input.bedtime === undefined &&
    existing?.bedtime !== undefined
      ? { bedtime: existing.bedtime }
      : {}),
    // Earlier clients cannot accidentally erase newer Morning sleep details.
    ...(input.period === "morning" &&
    input.morningSleep === undefined &&
    existing?.morningSleep !== undefined
      ? {
          morningSleep:
            existing.morningSleep === null
              ? null
              : { ...existing.morningSleep },
          // Retained canonical sleep remains authoritative for legacy summaries.
          sleepHours:
            existing.morningSleep?.totalSleepMinutes == null
              ? null
              : existing.morningSleep.totalSleepMinutes / 60,
        }
      : input.morningSleep === undefined
        ? {}
        : {
            morningSleep:
              input.morningSleep === null ? null : { ...input.morningSleep },
          }),
    moods: [...input.moods],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  // A period's edit leaves its counterpart on the same tracking day untouched.
  state.dailyCheckIns = [...checkIns.filter((entry) => !matches(entry)), saved];
}
