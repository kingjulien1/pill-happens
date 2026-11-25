import { dayKey, type AppData } from "@/lib/domain";
import { getCheckInPeriod, type DailyCheckIn } from "@/lib/daily-check-in";
import { groupNightSounds } from "@/lib/morning-sleep";
import type { DailyCheckInInput } from "./validation";

export const DAILY_CHECK_IN_LIMIT = 50_000;

export class DailyCheckInSaveError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

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
  // A full form must protect writing just like the reflection-only endpoint.
  // Legacy clients may create a record or submit unchanged writing, but cannot
  // replace a different existing note without naming the version they edited.
  // Equal notes are safe after this client's own autosave advanced the version.
  const sameNote = (existing?.note ?? "") === input.note;
  const versionMatches = existing
    ? input.expectedUpdatedAt !== undefined &&
      input.expectedUpdatedAt === existing.updatedAt
    : input.expectedUpdatedAt == null;
  if (!versionMatches && (!existing || !sameNote))
    throw new DailyCheckInSaveError(
      "This check-in changed elsewhere. Your draft is still kept on this device. Review the latest writing before saving again.",
      409,
    );
  if (!existing && checkIns.length >= DAILY_CHECK_IN_LIMIT)
    throw new DailyCheckInSaveError(
      "Your journal has reached its check-in limit. Export a backup before continuing.",
    );

  // Distinct saves must never share a version, including two writes in one ms.
  const previousTime = Date.parse(existing?.updatedAt ?? "");
  const timestamp = new Date(
    Math.max(
      now.getTime(),
      Number.isFinite(previousTime) ? previousTime + 1 : 0,
    ),
  ).toISOString();
  const fields = { ...input };
  delete fields.expectedUpdatedAt;
  // Hidden Evening fields are not a stale full-form snapshot. Resolve omission
  // against the current record inside this atomic write; null still clears it.
  let sleepHours =
    input.sleepHours === undefined
      ? (existing?.sleepHours ?? null)
      : input.sleepHours;
  if (
    input.period === "morning" &&
    input.morningSleep === undefined &&
    existing?.morningSleep !== undefined
  )
    sleepHours =
      existing.morningSleep?.totalSleepMinutes == null
        ? null
        : existing.morningSleep.totalSleepMinutes / 60;
  const saved: DailyCheckIn = {
    ...fields,
    sleepHours,
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
              : groupNightSounds(existing.morningSleep),
        }
      : input.morningSleep === undefined
        ? {}
        : {
            morningSleep:
              input.morningSleep === null
                ? null
                : groupNightSounds(input.morningSleep),
          }),
    moods: [...input.moods],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  // A period's edit leaves its counterpart on the same tracking day untouched.
  state.dailyCheckIns = [...checkIns.filter((entry) => !matches(entry)), saved];
}
