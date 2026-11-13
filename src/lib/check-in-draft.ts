import {
  isMorningSleepDraft,
  morningSleepDefaults,
  type MorningSleepDraft,
} from "./morning-sleep";
import {
  DAILY_MOOD_VALUES,
  DAILY_REFLECTION_MAX_LENGTH,
  type DailyCheckIn,
  type DailyCheckInPeriod,
  type DailyMood,
} from "./daily-check-in";
import { isCheckInRating, type CheckInRatingScale } from "./check-in-rating";

/** Keep the existing Evening key so saved drafts survive the period split. */
export function checkInDraftKey(
  day: string,
  period: DailyCheckInPeriod = "evening",
) {
  return `checkin:${day}${period === "morning" ? ":morning" : ""}`;
}

/** The tracking day belongs to the draft key; a clock rollover cannot rename it. */
export type CheckInDraft = {
  note: string;
  moods: DailyMood[];
  energy: number | null;
  stress: number | null;
  /** Missing on legacy drafts; each untagged field still uses the 1–5 scale. */
  energyScale?: CheckInRatingScale;
  stressScale?: CheckInRatingScale;
  sleepHours: string;
  /** Optional for older drafts; unfinished clock text stays recoverable. */
  bedtime?: string;
  helped: string;
  writingOpen?: boolean;
  /** Absent on legacy drafts: never silently publish them over a newer journal. */
  reflectionBaseUpdatedAt?: string | null;
  /** Optional so earlier raw drafts remain valid and recoverable. */
  morningSleep?: MorningSleepDraft;
};

export function checkInDefaults(
  checkIn?: DailyCheckIn,
  period: DailyCheckInPeriod = checkIn?.period ?? "evening",
): CheckInDraft {
  return {
    note: checkIn?.note ?? "",
    moods: [...(checkIn?.moods ?? [])],
    energy: checkIn?.energy ?? null,
    stress: checkIn?.stress ?? null,
    energyScale: checkIn ? (checkIn.energyScale ?? 5) : 10,
    stressScale: checkIn ? (checkIn.stressScale ?? 5) : 10,
    sleepHours:
      checkIn?.sleepHours === null || checkIn?.sleepHours === undefined
        ? ""
        : String(checkIn.sleepHours),
    helped: checkIn?.helped ?? "",
    writingOpen: false,
    reflectionBaseUpdatedAt: checkIn?.updatedAt ?? null,
    ...(period === "morning"
      ? {
          morningSleep: morningSleepDefaults(
            checkIn?.morningSleep,
            checkIn?.sleepHours,
          ),
        }
      : { bedtime: checkIn?.bedtime ?? "" }),
  };
}

/** A legacy raw duration overrides only the saved total, never newer sleep details. */
export function morningSleepForDraft(
  draft: CheckInDraft,
  checkIn?: DailyCheckIn,
): MorningSleepDraft {
  if (draft.morningSleep !== undefined) return draft.morningSleep;
  const base = morningSleepDefaults(checkIn?.morningSleep);
  const raw = draft.sleepHours;
  if (!raw.trim()) return { ...base, sleepHours: "", sleepMinutes: "" };
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24)
    return { ...base, sleepHours: raw, sleepMinutes: "" };
  const duration = morningSleepDefaults(undefined, hours);
  return {
    ...base,
    sleepHours: duration.sleepHours,
    sleepMinutes: duration.sleepMinutes,
  };
}

/** Obsolete prompt selections are ignored, preserving every valid legacy note. */
export function isCheckInDraft(value: unknown): value is CheckInDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.note === "string" &&
    draft.note.length <= DAILY_REFLECTION_MAX_LENGTH &&
    Array.isArray(draft.moods) &&
    draft.moods.length <= 4 &&
    draft.moods.every((value) =>
      DAILY_MOOD_VALUES.includes(value as DailyMood),
    ) &&
    isCheckInRating(draft.energy, draft.energyScale) &&
    isCheckInRating(draft.stress, draft.stressScale) &&
    typeof draft.sleepHours === "string" &&
    draft.sleepHours.length <= 256 &&
    (draft.bedtime === undefined ||
      (typeof draft.bedtime === "string" && draft.bedtime.length <= 256)) &&
    typeof draft.helped === "string" &&
    draft.helped.length <= 160 &&
    (draft.writingOpen === undefined ||
      typeof draft.writingOpen === "boolean") &&
    (draft.reflectionBaseUpdatedAt === undefined ||
      draft.reflectionBaseUpdatedAt === null ||
      (typeof draft.reflectionBaseUpdatedAt === "string" &&
        draft.reflectionBaseUpdatedAt.length <= 64 &&
        Number.isFinite(Date.parse(draft.reflectionBaseUpdatedAt)))) &&
    (draft.morningSleep === undefined ||
      isMorningSleepDraft(draft.morningSleep))
  );
}

/** Content edits share one predicate; opening an editor or updating save metadata is inert. */
export function hasCheckInDraftChanges(
  value: unknown,
  checkIn?: DailyCheckIn,
  period: DailyCheckInPeriod = checkIn?.period ?? "evening",
) {
  if (!isCheckInDraft(value)) return false;
  const defaults = checkInDefaults(checkIn, period);
  if (
    value.note !== defaults.note ||
    value.helped !== defaults.helped ||
    value.energy !== defaults.energy ||
    value.stress !== defaults.stress ||
    (value.energy !== null &&
      (value.energyScale ?? 5) !== defaults.energyScale) ||
    (value.stress !== null &&
      (value.stressScale ?? 5) !== defaults.stressScale) ||
    [...value.moods].sort().join(",") !== [...defaults.moods].sort().join(",")
  )
    return true;
  if (period === "evening")
    return (
      value.sleepHours !== defaults.sleepHours ||
      (value.bedtime ?? "") !== (defaults.bedtime ?? "")
    );
  const before = defaults.morningSleep!;
  const after = morningSleepForDraft(value, checkIn);
  return (Object.keys(before) as (keyof MorningSleepDraft)[]).some(
    (key) => before[key] !== after[key],
  );
}
