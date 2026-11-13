import {
  getMorningSleepValidationError,
  hasMorningSleepData,
} from "@/lib/morning-sleep";
import { z } from "zod";
import { isValidDayKey } from "@/lib/domain";
import { MEDICATION_TYPE_VALUES } from "@/lib/medication-types";
import { INTAKE_ROUTE_VALUES } from "@/lib/intake-routes";
import {
  MEDICATION_CATEGORY_VALUES,
  normalizeMedicationCategories,
} from "@/lib/medication-categories";
import { resolveMedicationCategoryPatch } from "./medication-category-patch";
import {
  DAILY_CHECK_IN_PERIODS,
  DAILY_MOOD_VALUES,
  DAILY_REFLECTION_MAX_LENGTH,
} from "@/lib/daily-check-in";
import {
  isMedicationIcon,
  MEDICATION_COLORS,
} from "@/lib/medication-appearance";

export const positiveAmount = z
  .number()
  .finite()
  .positive("Enter an amount greater than zero.")
  .max(100_000, "This amount is too large.");
const medicationFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a medication name.")
    .max(100, "Keep the name under 100 characters."),
  activeIngredient: z
    .string()
    .trim()
    .max(160, "Keep the active ingredient to 160 characters or fewer.")
    .optional(),
  isBenzodiazepine: z.boolean().optional(),
  isOpioid: z.boolean().optional(),
  categories: z
    .array(z.enum(MEDICATION_CATEGORY_VALUES))
    .max(
      MEDICATION_CATEGORY_VALUES.length,
      "Choose only registered medication categories.",
    )
    .refine(
      (values) => new Set(values).size === values.length,
      "Choose each medication category only once.",
    )
    .transform(normalizeMedicationCategories)
    .optional(),
  strengthMg: positiveAmount,
  defaultQuantity: positiveAmount
    .min(0.000001, "Use an intake amount of at least 0.000001.")
    .max(10_000, "This quantity is too large.")
    .optional(),
  form: z.enum(MEDICATION_TYPE_VALUES),
  color: z.enum(MEDICATION_COLORS.map((color) => color.value)),
  icon: z
    .string()
    .max(64, "Choose an icon or a single emoji.")
    .refine(isMedicationIcon, "Choose an icon or a single emoji.")
    .optional(),
  iconRotation: z.number().int().min(0).max(359).optional(),
});
export const medicationSchema = medicationFieldsSchema.transform((input) => ({
  ...input,
  ...resolveMedicationCategoryPatch(undefined, input),
}));
export const medicationPatchSchema = medicationFieldsSchema
  .partial()
  .extend({ archived: z.boolean().optional() })
  .transform((input) => ({
    ...input,
    ...resolveMedicationCategoryPatch(undefined, input),
  }));

export const intakeSchema = z.object({
  medicationId: z.string().uuid("Choose a medication."),
  quantity: positiveAmount.max(10_000, "This quantity is too large."),
  route: z.enum(INTAKE_ROUTE_VALUES).optional(),
  takenAt: z
    .string()
    .datetime({ offset: true, message: "Enter a valid date and time." })
    .refine(
      (value) =>
        Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now(),
      "An intake cannot be in the future.",
    ),
  note: z
    .string()
    .trim()
    .max(2000, "Keep notes under 2,000 characters.")
    .default(""),
});

const calendarDate = z
  .string()
  .refine(isValidDayKey, "Choose a valid calendar date.");

const morningRating = z
  .number()
  .finite()
  .int()
  .min(1)
  .max(10)
  .nullable()
  .default(null);
const morningMinutes = z
  .number()
  .finite()
  .int()
  .min(0)
  .max(1_440)
  .nullable()
  .default(null);
const checkInClock = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid 24-hour time (HH:mm).");
const morningClock = checkInClock.nullable().default(null);

export const morningSleepSchema = z
  .object({
    dreamRecall: morningRating,
    sleepiness: morningRating,
    sleepDepth: morningRating,
    restfulness: morningRating,
    sleepQuality: morningRating,
    lightsOut: morningClock,
    gotUp: morningClock,
    fallAsleepMinutes: morningMinutes,
    awakenings: z
      .number()
      .finite()
      .int()
      .min(0)
      .max(100)
      .nullable()
      .default(null),
    awakeMinutes: morningMinutes,
    totalSleepMinutes: morningMinutes,
    extraSleepMinutes: morningMinutes,
  })
  .strict()
  .superRefine((sleep, context) => {
    const message = getMorningSleepValidationError(sleep);
    if (message)
      context.addIssue({
        code: "custom",
        path: ["totalSleepMinutes"],
        message,
      });
  })
  .transform((sleep) => (hasMorningSleepData(sleep) ? sleep : null));

const checkInScale = z.number().finite().int().min(1).max(10).nullable();
const checkInRatingScale = z.union([z.literal(5), z.literal(10)]).optional();
export const dailyCheckInSchema = z
  .object({
    day: calendarDate,
    period: z.enum(DAILY_CHECK_IN_PERIODS).default("evening"),
    note: z
      .string()
      .max(
        DAILY_REFLECTION_MAX_LENGTH,
        "Keep your reflection to 100,000 characters or fewer.",
      )
      .default(""),
    moods: z
      .array(z.enum(DAILY_MOOD_VALUES))
      .max(4, "Choose up to four moods.")
      .refine(
        (moods) => new Set(moods).size === moods.length,
        "Choose each mood only once.",
      )
      .default([]),
    energy: checkInScale.default(null),
    stress: checkInScale.default(null),
    energyScale: checkInRatingScale,
    stressScale: checkInRatingScale,
    sleepHours: z.number().finite().min(0).max(24).nullable().default(null),
    morningSleep: morningSleepSchema.nullable().optional(),
    bedtime: checkInClock.nullable().optional(),
    helped: z
      .string()
      .trim()
      .max(160, "Keep what helped to 160 characters or fewer.")
      .default(""),
  })
  .superRefine((entry, context) => {
    for (const field of ["energy", "stress"] as const) {
      if (entry[field] !== null && entry[field] > (entry[`${field}Scale`] ?? 5))
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Use a whole rating within its stated scale.",
        });
    }
    if (entry.period !== "morning" && entry.morningSleep !== undefined)
      context.addIssue({
        code: "custom",
        path: ["morningSleep"],
        message: "Sleep details belong to the Morning Check-In.",
      });
    if (entry.period !== "evening" && entry.bedtime != null)
      context.addIssue({
        code: "custom",
        path: ["bedtime"],
        message: "Tonight’s bedtime belongs to the Evening Check-In.",
      });
  })
  .transform((entry) => {
    const result = { ...entry };
    const { morningSleep } = result;
    // Missing old-client values stay absent; Morning never owns this field.
    if (entry.bedtime === undefined || entry.period !== "evening")
      delete result.bedtime;
    // Omitted fields stay absent for legacy clients. Explicit null clears sleep.
    if (morningSleep === undefined) delete result.morningSleep;
    else
      result.sleepHours =
        morningSleep?.totalSleepMinutes === null || morningSleep === null
          ? null
          : morningSleep.totalSleepMinutes / 60;
    return result;
  })
  .refine(
    (entry) =>
      Boolean(entry.note.trim() || entry.helped || entry.moods.length) ||
      entry.energy !== null ||
      entry.stress !== null ||
      entry.sleepHours !== null ||
      entry.bedtime != null ||
      hasMorningSleepData(
        "morningSleep" in entry ? entry.morningSleep : undefined,
      ),
    "Add a few words, a mood, or one of the optional details before saving.",
  );

export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>;

export const goalSchema = z
  .object({
    medicationId: z.string().uuid("Choose a medication."),
    dailyLimitMg: z
      .number()
      .finite()
      .nonnegative("Enter a daily maximum of zero or greater.")
      .max(100_000, "This amount is too large."),
    startsOn: calendarDate,
    endsOn: calendarDate.nullable().default(null),
    note: z
      .string()
      .trim()
      .max(2000, "Keep notes under 2,000 characters.")
      .default(""),
  })
  .refine((goal) => !goal.endsOn || goal.endsOn >= goal.startsOn, {
    message: "The end date must be on or after the start date.",
    path: ["endsOn"],
  });

export const settingsSchema = z.object({
  timezone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid IANA time zone."),
});
