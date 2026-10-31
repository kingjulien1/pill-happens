import {
  dayKey,
  fromLocalInput,
  toLocalInput,
  type Intake,
  type Medication,
} from "./domain";

/** Raw controls stay strings; the original instant keeps seconds and DST offset. */
export type IntakeFormDraft = {
  medicationId: string;
  quantity: string;
  initialTimestamp: string;
  takenAt: string;
  timezone: string;
  note: string;
};

export function newIntakeFormDraft({
  intake,
  initialDay,
  medications,
  timezone,
  now = new Date(),
}: {
  intake?: Intake;
  initialDay?: string;
  medications: readonly Medication[];
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
    initialTimestamp,
    takenAt: toLocalInput(initialTimestamp, timezone),
    timezone,
    note: intake?.note ?? "",
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
    typeof item.initialTimestamp !== "string" ||
    item.initialTimestamp.length > 40 ||
    !Number.isFinite(Date.parse(item.initialTimestamp)) ||
    typeof item.takenAt !== "string" ||
    item.takenAt.length > 80 ||
    typeof item.timezone !== "string" ||
    item.timezone.length > 128 ||
    typeof item.note !== "string" ||
    item.note.length > 1000
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
