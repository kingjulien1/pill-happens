import { z } from "zod";
import { dayKey, isValidDayKey, type AppData } from "@/lib/domain";
import {
  DAILY_CHECK_IN_PERIODS,
  DAILY_REFLECTION_MAX_LENGTH,
  getCheckInPeriod,
  type DailyCheckIn,
} from "@/lib/daily-check-in";
import { hasMorningSleepData } from "@/lib/morning-sleep";
import { DAILY_CHECK_IN_LIMIT } from "./daily-check-ins";

export const dailyReflectionSchema = z.object({
  day: z.string().refine(isValidDayKey, "Choose a valid tracking day."),
  period: z.enum(DAILY_CHECK_IN_PERIODS),
  note: z.string().max(DAILY_REFLECTION_MAX_LENGTH),
  expectedUpdatedAt: z
    .string()
    .max(64)
    .refine(
      (value) => Number.isFinite(Date.parse(value)),
      "Invalid reflection version.",
    )
    .nullable(),
});

export class DailyReflectionSaveError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Apply within the repository CAS; only the selected period's writing changes. */
export function saveDailyReflection(
  state: AppData,
  input: z.infer<typeof dailyReflectionSchema>,
  now: Date,
) {
  if (input.day > dayKey(now, state.settings.timezone))
    throw new DailyReflectionSaveError(
      400,
      "A reflection cannot be saved for a future tracking day.",
    );
  const entries = state.dailyCheckIns ?? [];
  const matches = (entry: DailyCheckIn) =>
    entry.day === input.day && getCheckInPeriod(entry) === input.period;
  const existing = entries.find(matches);
  // Safe after an ambiguous network result, without changing timestamps again.
  if (existing?.note === input.note || (!existing && !input.note.trim()))
    return;
  if ((existing?.updatedAt ?? null) !== input.expectedUpdatedAt)
    throw new DailyReflectionSaveError(
      409,
      "This check-in changed elsewhere. Your writing is still kept on this device. Review the latest journal before saving again.",
    );
  const timestamp =
    existing?.updatedAt === now.toISOString()
      ? new Date(now.getTime() + 1).toISOString()
      : now.toISOString();
  if (existing) {
    const hasOtherContent =
      existing.moods.length > 0 ||
      existing.energy != null ||
      existing.stress != null ||
      existing.sleepHours != null ||
      existing.bedtime != null ||
      Boolean(existing.helped.trim()) ||
      hasMorningSleepData(existing.morningSleep);
    state.dailyCheckIns =
      !input.note.trim() && !hasOtherContent
        ? entries.filter((entry) => !matches(entry))
        : entries.map((entry) =>
            matches(entry)
              ? { ...entry, note: input.note, updatedAt: timestamp }
              : entry,
          );
    return;
  }
  if (entries.length >= DAILY_CHECK_IN_LIMIT)
    throw new DailyReflectionSaveError(
      400,
      "Your journal has reached its check-in limit. Export a backup before continuing.",
    );
  state.dailyCheckIns = [
    ...entries,
    {
      day: input.day,
      period: input.period,
      note: input.note,
      moods: [],
      energy: null,
      stress: null,
      sleepHours: null,
      helped: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}
