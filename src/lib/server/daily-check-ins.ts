import { dayKey, type AppData } from "@/lib/domain";
import type { DailyCheckIn } from "@/lib/daily-check-in";
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
  const existing = checkIns.find((entry) => entry.day === input.day);
  if (!existing && checkIns.length >= DAILY_CHECK_IN_LIMIT)
    throw new DailyCheckInSaveError(
      "Your journal has reached its check-in limit. Export a backup before continuing.",
    );

  const timestamp = now.toISOString();
  const saved: DailyCheckIn = {
    ...input,
    moods: [...input.moods],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  // The day is the identity. An edit replaces it rather than appending another.
  state.dailyCheckIns = [
    ...checkIns.filter((entry) => entry.day !== input.day),
    saved,
  ];
}
