import { z } from "zod";
import { isValidDayKey } from "@/lib/domain";
import { MEDICATION_TYPE_VALUES } from "@/lib/medication-types";
import { DAILY_MOOD_VALUES } from "@/lib/daily-check-in";
import {
  isMedicationIcon,
  MEDICATION_COLORS,
} from "@/lib/medication-appearance";

export const positiveAmount = z
  .number()
  .finite()
  .positive("Enter an amount greater than zero.")
  .max(100_000, "This amount is too large.");
export const medicationSchema = z.object({
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
export const medicationPatchSchema = medicationSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export const intakeSchema = z.object({
  medicationId: z.string().uuid("Choose a medication."),
  quantity: positiveAmount.max(10_000, "This quantity is too large."),
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

const checkInScale = z.number().finite().int().min(1).max(5).nullable();
export const dailyCheckInSchema = z
  .object({
    day: calendarDate,
    note: z
      .string()
      .trim()
      .max(800, "Keep your reflection to 800 characters or fewer.")
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
    sleepHours: z.number().finite().min(0).max(24).nullable().default(null),
    helped: z
      .string()
      .trim()
      .max(160, "Keep what helped to 160 characters or fewer.")
      .default(""),
  })
  .refine(
    (entry) =>
      Boolean(entry.note || entry.helped || entry.moods.length) ||
      entry.energy !== null ||
      entry.stress !== null ||
      entry.sleepHours !== null,
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
