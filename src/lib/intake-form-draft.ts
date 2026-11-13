import {
  dayKey,
  fromLocalInput,
  toLocalInput,
  type Intake,
  type Medication,
} from "./domain";
import {
  isIntakeRoute,
  preferredIntakeRoute,
  type IntakeRoute,
} from "./intake-routes";

/** Raw controls stay strings; the original instant keeps seconds and DST offset. */
export type IntakeFormDraft = {
  medicationId: string;
  quantity: string;
  /** Missing on older drafts; the form keeps the entry's saved route. */
  route?: IntakeRoute;
  initialTimestamp: string;
  takenAt: string;
  timezone: string;
};

export function newIntakeFormDraft({
  intake,
  initialDay,
  medications,
  intakes = [],
  timezone,
  now = new Date(),
}: {
  intake?: Intake;
  initialDay?: string;
  medications: readonly Medication[];
  intakes?: readonly Intake[];
  timezone: string;
  now?: Date;
}): IntakeFormDraft {
  const medicationId = intake?.medicationId ?? medications[0]?.id ?? "";
  const initialTimestamp =
    intake?.takenAt ??
    (initialDay && initialDay !== dayKey(now, timezone)
      ? fromLocalInput(`${initialDay}T12:00`, timezone)
      : now.toISOString());
  return {
    medicationId,
    quantity: String(
      intake?.quantity ??
        medications.find((item) => item.id === medicationId)?.defaultQuantity ??
        1,
    ),
    route: intake
      ? (intake.route ?? "unspecified")
      : preferredIntakeRoute(medicationId, intakes),
    initialTimestamp,
    takenAt: toLocalInput(initialTimestamp, timezone),
    timezone,
  };
}

export function isIntakeFormDraft(value: unknown): value is IntakeFormDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item.medicationId !== "string" ||
    item.medicationId.length > 150 ||
    typeof item.quantity !== "string" ||
    item.quantity.length > 256 ||
    (item.route !== undefined && !isIntakeRoute(item.route)) ||
    typeof item.initialTimestamp !== "string" ||
    item.initialTimestamp.length > 40 ||
    !Number.isFinite(Date.parse(item.initialTimestamp)) ||
    typeof item.takenAt !== "string" ||
    item.takenAt.length > 80 ||
    typeof item.timezone !== "string" ||
    item.timezone.length > 128
  )
    return false;
  try {
    toLocalInput(item.initialTimestamp, item.timezone);
    return true;
  } catch {
    return false;
  }
}

/** Interpret a restored field in the timezone in which the user entered it. */
export function intakeDraftTimestamp(draft: IntakeFormDraft): string {
  return draft.takenAt === toLocalInput(draft.initialTimestamp, draft.timezone)
    ? draft.initialTimestamp
    : fromLocalInput(draft.takenAt, draft.timezone);
}

/** A timezone change adjusts the display, never silently reinterprets the dose. */
export function intakeDraftDisplayTime(
  draft: IntakeFormDraft,
  timezone: string,
): string {
  if (draft.timezone === timezone || !draft.takenAt) return draft.takenAt;
  try {
    return toLocalInput(intakeDraftTimestamp(draft), timezone);
  } catch {
    // A partially entered/invalid control remains available for correction.
    return draft.takenAt;
  }
}
