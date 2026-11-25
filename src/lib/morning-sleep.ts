import {
  reportMetrics,
  sleepCycleMetrics,
  type ReportMetric,
} from "./sleep-cycle-report";

/** Optional, self-reported sleep details. Clock differences are estimates, not instants. */
export type MorningSleep = Partial<Record<ReportMetric, number>> & {
  nightSounds?: { snoringMinutes?: number; coughingRate?: number };
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
> &
  Partial<Record<ReportMetric, string>> & {
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

export const sleepStageKeys = [
  "lightMinutes",
  "dreamMinutes",
  "deepMinutes",
] as const;
export const sleepTargetMinutes = 630;

/** A missing stage contributes no reading. A reported zero is still a reading. */
export function recordedStageMinutes(
  stages: Partial<Record<(typeof sleepStageKeys)[number], string | number>>,
) {
  let total: number | null = null;
  for (const key of sleepStageKeys) {
    const raw = stages[key];
    if (raw == null || (typeof raw === "string" && !raw.trim())) continue;
    if (typeof raw === "string" && !/^\d+$/.test(raw.trim())) return NaN;
    const minutes = Number(raw);
    if (!validMinutes(minutes)) return NaN;
    total = (total ?? 0) + minutes;
  }
  return total !== null && total > 1440 ? NaN : total;
}

/** Read either generation of the report and write the two sound units together. */
export function groupNightSounds(sleep: MorningSleep): MorningSleep {
  const { snoringMinutes, coughingRate, nightSounds, ...rest } = sleep;
  const minutes = nightSounds?.snoringMinutes ?? snoringMinutes;
  const rate = nightSounds?.coughingRate ?? coughingRate;
  if (minutes == null && rate == null) return rest;
  return {
    ...rest,
    nightSounds: {
      ...(minutes != null && { snoringMinutes: minutes }),
      ...(rate != null && { coughingRate: rate }),
    },
  };
}

export function nightFeelingPercent(
  ratings: Pick<
    MorningSleep,
    "restfulness" | "sleepQuality" | "sleepDepth" | "sleepiness"
  >,
) {
  const answers = [
    ratings.restfulness,
    ratings.sleepQuality,
    ratings.sleepDepth,
    validRating(ratings.sleepiness) ? 11 - ratings.sleepiness : null,
  ].filter(validRating);
  if (!answers.length) return null;
  return Math.round(
    (100 * answers.reduce((sum, rating) => sum + rating - 1, 0)) /
      (9 * answers.length),
  );
}

export function withSleepStageTotals(
  draft: MorningSleepDraft,
): MorningSleepDraft {
  const total = recordedStageMinutes(draft);
  if (!validMinutes(total)) return draft;
  const extra = Math.max(0, sleepTargetMinutes - total);
  const calculated = {
    sleepHours: String(Math.floor(total / 60)),
    sleepMinutes: String(total % 60),
    extraSleepHours: String(Math.floor(extra / 60)),
    extraSleepMinutes: String(extra % 60),
  };
  return draft.sleepHours === calculated.sleepHours &&
    draft.sleepMinutes === calculated.sleepMinutes &&
    draft.extraSleepHours === calculated.extraSleepHours &&
    draft.extraSleepMinutes === calculated.extraSleepMinutes
    ? draft
    : { ...draft, ...calculated };
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
  const readings = { ...saved, ...saved?.nightSounds };
  return withSleepStageTotals({
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
    ...Object.fromEntries(
      reportMetrics
        .filter((key) => readings[key] != null)
        .map((key) => [key, String(readings[key])]),
    ),
    extraSleepHours: extra.hours,
    extraSleepMinutes: extra.minutes,
  });
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
    reportMetrics.every(
      (key) =>
        draft[key] === undefined ||
        (typeof draft[key] === "string" && draft[key].length <= 256),
    ) &&
    textFields.every(
      (key) => typeof draft[key] === "string" && draft[key].length <= 256,
    )
  );
}

export function hasMorningSleepContent(draft: MorningSleepDraft) {
  return (
    MORNING_SLEEP_RATING_FIELDS.some((key) => draft[key] !== null) ||
    reportMetrics.some((key) => draft[key]?.trim()) ||
    textFields.some((key) => draft[key].trim().length > 0)
  );
}

/** Midnight rolls forward once; equal clocks describe a zero-minute window. */
export function getMorningSleepSummary(
  sleep?: Pick<
    MorningSleep,
    "lightsOut" | "gotUp" | "totalSleepMinutes"
  > | null,
): {
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
  if (Number.isNaN(recordedStageMinutes(sleep)))
    return "The recorded sleep stages must add up to 24 hours or less.";
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
  draft = withSleepStageTotals(draft);
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
  for (const key of reportMetrics) {
    const raw = draft[key]?.trim();
    if (!raw) continue;
    const number = Number(raw);
    const pattern = key === "coughingRate" ? /^\d+(?:\.\d+)?$/ : /^\d+$/;
    if (
      !pattern.test(raw) ||
      !Number.isFinite(number) ||
      number > sleepCycleMetrics[key].max
    )
      error ??= "Check the value for " + sleepCycleMetrics[key].label + ".";
    else sleep[key] = number;
  }
  if (error) return { value: null, error };
  error = getMorningSleepValidationError(sleep);
  return { value: error ? null : groupNightSounds(sleep), error };
}
