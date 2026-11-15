import type { Goal, Intake, Medication } from "@/lib/domain";
import type { DailyCheckIn, DailyCheckInPeriod } from "@/lib/daily-check-in";
import { getMedicationCategories } from "@/lib/medication-categories";
import type { MedicationCategory } from "@/lib/medication-categories";
import type { MedicationType } from "@/lib/medication-types";
import type { IntakeRoute } from "@/lib/intake-routes";
import { reflectionStats } from "@/lib/reflection-writing";

/** Immutable, serializable presentation data; never carries Undo tokens or callbacks. */
export type NotificationMedicationSnapshot = {
  name: string;
  activeIngredient?: string;
  strengthMg: number;
  defaultQuantity: number;
  form: MedicationType;
  color: Medication["color"];
  icon?: string;
  iconRotation?: number;
  archived: boolean;
  categories: MedicationCategory[];
};

export type NotificationPreviewRecord =
  | {
      kind: "intake";
      name: string;
      quantity: number;
      strengthMg: number;
      form?: MedicationType;
      takenAt: string;
      timeZone: string;
      route?: IntakeRoute;
      medication?: NotificationMedicationSnapshot;
    }
  | { kind: "medication"; medication: NotificationMedicationSnapshot }
  | {
      kind: "check-in";
      day: string;
      period: DailyCheckInPeriod;
      words: number;
      moods: DailyCheckIn["moods"];
      energy: number | null;
      energyScale: number;
      stress: number | null;
      stressScale: number;
      sleepHours: number | null;
      bedtime?: string | null;
    }
  | {
      kind: "goal";
      medication?: NotificationMedicationSnapshot;
      dailyLimitMg: number;
      startsOn: string;
      endsOn: string | null;
    }
  | { kind: "timezone"; timeZone: string };

/** Edits compare actual snapshots; additions/removals have just one side. */
export type NotificationChangePreview = {
  before?: NotificationPreviewRecord;
  after?: NotificationPreviewRecord;
};

export function medicationNotificationSnapshot(
  medication: Medication,
): NotificationMedicationSnapshot {
  return {
    name: medication.name,
    activeIngredient: medication.activeIngredient,
    strengthMg: medication.strengthMg,
    defaultQuantity: medication.defaultQuantity ?? 1,
    form: medication.form,
    color: medication.color,
    icon: medication.icon,
    iconRotation: medication.iconRotation,
    archived: medication.archived,
    categories: [...getMedicationCategories(medication)],
  };
}

export function intakeNotificationSnapshot(
  intake: Intake,
  medication: Medication | undefined,
  timeZone: string,
): NotificationPreviewRecord {
  return {
    kind: "intake",
    name: intake.medicationName,
    quantity: intake.quantity,
    strengthMg: intake.strengthMg,
    form: intake.medicationForm ?? medication?.form,
    takenAt: intake.takenAt,
    timeZone,
    route: intake.route,
    ...(medication
      ? { medication: medicationNotificationSnapshot(medication) }
      : {}),
  };
}

export function checkInNotificationSnapshot(
  checkIn: DailyCheckIn,
): NotificationPreviewRecord {
  return {
    kind: "check-in",
    day: checkIn.day,
    period: checkIn.period ?? "evening",
    words: reflectionStats(checkIn.note).words,
    moods: [...checkIn.moods],
    energy: checkIn.energy,
    energyScale: checkIn.energyScale ?? 5,
    stress: checkIn.stress,
    stressScale: checkIn.stressScale ?? 5,
    sleepHours: checkIn.sleepHours,
    bedtime: checkIn.bedtime,
  };
}

export function goalNotificationSnapshot(
  goal: Goal,
  medication?: Medication,
): NotificationPreviewRecord {
  return {
    kind: "goal",
    dailyLimitMg: goal.dailyLimitMg,
    startsOn: goal.startsOn,
    endsOn: goal.endsOn,
    ...(medication
      ? { medication: medicationNotificationSnapshot(medication) }
      : {}),
  };
}

/** Prefer the server receipt; without one, only a single proven new ID is safe. */
export function savedNotificationRecord<T extends { id: string }>(
  before: readonly T[],
  after: readonly T[],
  entityId?: string,
): T | undefined {
  if (entityId) return after.find((record) => record.id === entityId);
  const existing = new Set(before.map((record) => record.id));
  const added = after.filter((record) => !existing.has(record.id));
  return added.length === 1 ? added[0] : undefined;
}
