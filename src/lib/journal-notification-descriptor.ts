import { z } from "zod";
import { MEDICATION_TYPE_VALUES } from "./medication-types";
import { MEDICATION_CATEGORY_VALUES } from "./medication-categories";
import { INTAKE_ROUTE_VALUES } from "./intake-routes";
import { MEDICATION_COLORS, isMedicationIcon } from "./medication-appearance";
import { DAILY_MOODS } from "./daily-check-in";
import { isValidDayKey } from "./domain";

const text = z.string().max(100_000);
const finite = z.number().finite();
const positive = finite.nonnegative();
const day = z.string().refine(isValidDayKey);
const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
});
const colors = new Set<string>(MEDICATION_COLORS.map(({ value }) => value));
const moods = new Set<string>(DAILY_MOODS.map(({ value }) => value));
const medication = z.object({
  name: text,
  activeIngredient: text.optional(),
  strengthMg: positive,
  defaultQuantity: positive,
  form: z.enum(MEDICATION_TYPE_VALUES),
  color: z.string().refine((value) => colors.has(value)),
  icon: z.string().refine(isMedicationIcon).optional(),
  iconRotation: finite.optional(),
  archived: z.boolean(),
  categories: z.array(z.enum(MEDICATION_CATEGORY_VALUES)),
});
const previewRecord = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("intake"),
    name: text,
    quantity: positive,
    strengthMg: positive,
    form: z.enum(MEDICATION_TYPE_VALUES).optional(),
    takenAt: timestamp,
    timeZone: timezone,
    route: z.enum(INTAKE_ROUTE_VALUES).optional(),
    medication: medication.optional(),
  }),
  z.object({ kind: z.literal("medication"), medication }),
  z.object({
    kind: z.literal("check-in"),
    day,
    period: z.enum(["morning", "evening"]),
    words: positive,
    moods: z.array(z.string().refine((value) => moods.has(value))),
    energy: finite.nullable(),
    energyScale: positive,
    stress: finite.nullable(),
    stressScale: positive,
    sleepHours: positive.nullable(),
    bedtime: z.string().nullable().optional(),
  }),
  z.object({
    kind: z.literal("goal"),
    medication: medication.optional(),
    dailyLimitMg: positive,
    startsOn: day,
    endsOn: day.nullable(),
  }),
  z.object({ kind: z.literal("timezone"), timeZone: timezone }),
]);

/** Only local journal destinations can be restored as executable links. */
export const notificationHref = z
  .string()
  .max(4_096)
  .refine((value) =>
    /^\/(?:$|[?#]|(?:history|medications|goals|journal|guide|developer-guide|streaks)(?:[/?#]|$))/.test(
      value,
    ),
  );

export const notificationReceipt = z.object({
  token: z.string().min(1).max(1_000_000),
  expiresAt: timestamp,
});

/** Versioned display data and a server-verified command; never a saved closure. */
export const journalNotificationDescriptor = z.object({
  version: z.literal(1),
  kind: z.enum(["success", "error", "info", "warning", "loading", "update"]),
  heading: text,
  message: text,
  dismissible: z.boolean(),
  variant: z.literal("intake-saved").optional(),
  details: z
    .object({
      preview: z
        .object({
          before: previewRecord.optional(),
          after: previewRecord.optional(),
        })
        .optional(),
      paragraphs: z.array(text).optional(),
      facts: z.array(z.object({ label: text, value: text })).optional(),
      links: z
        .array(z.object({ label: text, href: notificationHref }))
        .optional(),
      footer: text.optional(),
    })
    .optional(),
  undo: z
    .object({
      receipt: notificationReceipt,
      label: text.optional(),
      pendingLabel: text.optional(),
      successLabel: text.optional(),
    })
    .optional(),
});

export type PersistedNotificationDescriptor = z.infer<
  typeof journalNotificationDescriptor
>;

export function isPersistedNotificationDescriptor(
  value: unknown,
): value is PersistedNotificationDescriptor {
  return journalNotificationDescriptor.safeParse(value).success;
}
