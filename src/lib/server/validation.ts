import { z } from "zod";
import { isValidDayKey } from "@/lib/domain";

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
  strengthMg: positiveAmount,
  form: z.enum(["tablet", "capsule", "drops", "other"]),
  color: z.enum(["rose", "amber", "violet"]),
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
