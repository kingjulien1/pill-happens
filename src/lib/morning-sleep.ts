/** Optional, self-reported sleep details. Clock differences are estimates, not instants. */
export type MorningSleep = {
  dreamRecall: number | null;
  sleepiness: number | null;
  sleepDepth: number | null;
  restfulness: number | null;
  sleepQuality: number | null;
  lightsOut: string | null;
  gotUp: string | null;
  fallAsleepMinutes: number | null;
  awakenings: number | null;
  awakeMinutes: number | null;
  totalSleepMinutes: number | null;
  extraSleepMinutes: number | null;
};

export const MORNING_SLEEP_RATING_FIELDS = [
  "dreamRecall",
  "sleepiness",
  "sleepDepth",
  "restfulness",
  "sleepQuality",
] as const;

/** Raw text is kept intact in device drafts, including blank or unfinished numbers. */
export type MorningSleepDraft = Pick<
  MorningSleep,
  (typeof MORNING_SLEEP_RATING_FIELDS)[number]
> & {
  lightsOut: string;
  gotUp: string;
  fallAsleepMinutes: string;
  awakenings: string;
  awakeMinutes: string;
  sleepHours: string;
  sleepMinutes: string;
  extraSleepHours: string;
  extraSleepMinutes: string;
};

const textFields = [
  "lightsOut",
  "gotUp",
  "fallAsleepMinutes",
  "awakenings",
  "awakeMinutes",
  "sleepHours",
  "sleepMinutes",
  "extraSleepHours",
  "extraSleepMinutes",
] as const;

export function emptyMorningSleep(): MorningSleep {
  return {
    dreamRecall: null,
    sleepiness: null,
    sleepDepth: null,
    restfulness: null,
    sleepQuality: null,
    lightsOut: null,
    gotUp: null,
    fallAsleepMinutes: null,
    awakenings: null,
    awakeMinutes: null,
    totalSleepMinutes: null,
    extraSleepMinutes: null,
  };
}

const validMinutes = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 1_440;

const validRating = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 10;

const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const clockMinutes = (value: string | null | undefined) =>
  typeof value === "string" && clockPattern.test(value)
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
    : null;

export function hasMorningSleepData(sleep?: MorningSleep | null) {
  return Boolean(
    sleep &&
    Object.values(sleep).some((value) => value !== null && value !== undefined),
  );
}

export function morningSleepDefaults(
  saved?: MorningSleep | null,
  legacySleepHours?: number | null,
): MorningSleepDraft {
  const total = saved
    ? saved.totalSleepMinutes
    : typeof legacySleepHours === "number" &&
        Number.isFinite(legacySleepHours) &&
        legacySleepHours >= 0 &&
        legacySleepHours <= 24
      ? Math.round(legacySleepHours * 60)
      : null;
  const duration = (value: number | null | undefined) =>
    validMinutes(value)
      ? { hours: String(Math.floor(value / 60)), minutes: String(value % 60) }
      : { hours: "", minutes: "" };
  const asleep = duration(total);
  const extra = duration(saved?.extraSleepMinutes);
  const raw = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : String(value);
  return {
    dreamRecall: validRating(saved?.dreamRecall) ? saved.dreamRecall : null,
    sleepiness: validRating(saved?.sleepiness) ? saved.sleepiness : null,
    sleepDepth: validRating(saved?.sleepDepth) ? saved.sleepDepth : null,
    restfulness: validRating(saved?.restfulness) ? saved.restfulness : null,
    sleepQuality: validRating(saved?.sleepQuality) ? saved.sleepQuality : null,
    lightsOut: saved?.lightsOut ?? "",
    gotUp: saved?.gotUp ?? "",
    fallAsleepMinutes: raw(saved?.fallAsleepMinutes),
    awakenings: raw(saved?.awakenings),
    awakeMinutes: raw(saved?.awakeMinutes),
    sleepHours: asleep.hours,
    sleepMinutes: asleep.minutes,
    extraSleepHours: extra.hours,
    extraSleepMinutes: extra.minutes,
  };
}

export function isMorningSleepDraft(
  value: unknown,
): value is MorningSleepDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  return (
    MORNING_SLEEP_RATING_FIELDS.every(
      (key) => draft[key] === null || validRating(draft[key]),
    ) &&
    textFields.every(
      (key) => typeof draft[key] === "string" && draft[key].length <= 256,
    )
  );
}

export function hasMorningSleepContent(draft: MorningSleepDraft) {
  return (
    MORNING_SLEEP_RATING_FIELDS.some((key) => draft[key] !== null) ||
    textFields.some((key) => draft[key].trim().length > 0)
  );
}

/** Midnight rolls forward once; equal clocks describe a zero-minute window. */
export function getMorningSleepSummary(sleep?: MorningSleep | null): {
  timeInBedMinutes: number | null;
  sleepEfficiency: number | null;
} {
  const start = clockMinutes(sleep?.lightsOut);
  const end = clockMinutes(sleep?.gotUp);
  const timeInBedMinutes =
    start === null || end === null ? null : (end - start + 1_440) % 1_440;
  const total = sleep?.totalSleepMinutes;
  const sleepEfficiency =
    timeInBedMinutes !== null &&
    timeInBedMinutes > 0 &&
    validMinutes(total) &&
    total <= timeInBedMinutes
      ? (total / timeInBedMinutes) * 100
      : null;
  return { timeInBedMinutes, sleepEfficiency };
}

/** Shared by the raw draft parser and API after their individual field checks. */
export function getMorningSleepValidationError(
  sleep: MorningSleep,
): string | null {
  const { timeInBedMinutes } = getMorningSleepSummary(sleep);
  return timeInBedMinutes !== null &&
    sleep.totalSleepMinutes !== null &&
    sleep.totalSleepMinutes > timeInBedMinutes
    ? "Total sleep cannot be longer than the time between lights out and getting up. Check these clock-time estimates."
    : null;
}

export function parseMorningSleepDraft(draft: MorningSleepDraft): {
  value: MorningSleep | null;
  error: string | null;
} {
  if (!isMorningSleepDraft(draft))
    return {
      value: null,
      error:
        "Use whole sleep ratings from 1 to 10 and review the entered times.",
    };
  if (!hasMorningSleepContent(draft)) return { value: null, error: null };
  const sleep = emptyMorningSleep();
  for (const key of MORNING_SLEEP_RATING_FIELDS) sleep[key] = draft[key];
  let error: string | null = null;
  const integer = (raw: string, label: string, maximum: number) => {
    const text = raw.trim();
    if (!text) return null;
    const value = Number(text);
    if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(value) ||
      value > maximum
    ) {
      error ??= label + " must be a whole number from 0 to " + maximum + ".";
      return null;
    }
    return value;
  };
  for (const [key, label] of [
    ["lightsOut", "Lights-out time"],
    ["gotUp", "Getting-up time"],
  ] as const) {
    const value = draft[key].trim();
    if (value && !clockPattern.test(value))
      error ??= label + " must use a valid 24-hour time (HH:mm).";
    sleep[key] = value || null;
  }
  sleep.fallAsleepMinutes = integer(
    draft.fallAsleepMinutes,
    "Time to fall asleep",
    1_440,
  );
  sleep.awakenings = integer(draft.awakenings, "Number of awakenings", 100);
  sleep.awakeMinutes = integer(
    draft.awakeMinutes,
    "Time awake during the night",
    1_440,
  );
  const duration = (hours: string, minutes: string, label: string) => {
    if (!hours.trim() && !minutes.trim()) return null;
    const h = integer(hours, label + " hours", 24);
    const m = integer(minutes, label + " minutes", 59);
    const total = (h ?? 0) * 60 + (m ?? 0);
    if (total > 1_440) error ??= label + " must be 24 hours or less.";
    return total;
  };
  sleep.totalSleepMinutes = duration(
    draft.sleepHours,
    draft.sleepMinutes,
    "Total sleep",
  );
  sleep.extraSleepMinutes = duration(
    draft.extraSleepHours,
    draft.extraSleepMinutes,
    "Extra sleep wanted",
  );
  if (error) return { value: null, error };
  error = getMorningSleepValidationError(sleep);
  return { value: error ? null : sleep, error };
}
