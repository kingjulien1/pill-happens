import type { Goal, Intake, Medication } from "@/lib/domain";
import type { DailyCheckIn, DailyCheckInPeriod } from "@/lib/daily-check-in";
import { getMedicationCategories } from "@/lib/medication-categories";
import type { MedicationCategory } from "@/lib/medication-categories";
import type { MedicationType } from "@/lib/medication-types";
import type { IntakeRoute } from "@/lib/intake-routes";
import { reflectionStats } from "@/lib/reflection-writing";
import { formatDose } from "@/lib/domain";

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

/** Describe only differences carried by the confirmed, display-only snapshots. */
export function notificationChangeSummary(
  preview: NotificationChangePreview,
): string {
  const { before, after } = preview;
  const record = after ?? before;
  if (!record) return "";
  const label = {
    intake: "Intake",
    medication: "Medication",
    "check-in": "Check-in",
    goal: "Goal",
    timezone: "Timezone",
  }[record.kind];
  if (!after) return `${label} removed from your journal.`;
  if (!before) {
    if (after.kind === "intake")
      return `${formatDose(after.quantity * after.strengthMg)} mg recorded for ${after.name}.`;
    return `${label} saved in your journal.`;
  }
  const changes: string[] = [];
  const changed = (condition: boolean, field: string) => {
    if (condition) changes.push(field);
  };
  if (before.kind === "intake" && after.kind === "intake") {
    const oldDose = before.quantity * before.strengthMg;
    const newDose = after.quantity * after.strengthMg;
    changed(before.quantity !== after.quantity, "quantity");
    changed(before.strengthMg !== after.strengthMg, "strength");
    changed(before.name !== after.name, "medication");
    changed(before.form !== after.form, "medication type");
    changed(
      Date.parse(before.takenAt) !== Date.parse(after.takenAt),
      "time taken",
    );
    changed(before.route !== after.route, "intake method");
    if (
      changes.length &&
      changes.every((field) => field === "quantity" || field === "strength") &&
      oldDose !== newDose
    )
      return `Dose changed from ${formatDose(oldDose)} to ${formatDose(newDose)} mg.`;
  } else if (before.kind === "medication" && after.kind === "medication") {
    const a = before.medication;
    const b = after.medication;
    changed(a.name !== b.name, "name");
    changed(a.activeIngredient !== b.activeIngredient, "active substance");
    changed(a.strengthMg !== b.strengthMg, "strength");
    changed(a.defaultQuantity !== b.defaultQuantity, "default quantity");
    changed(a.form !== b.form, "medication type");
    changed(
      a.archived !== b.archived,
      b.archived ? "archive status" : "active status",
    );
    changed(
      a.color !== b.color ||
        a.icon !== b.icon ||
        a.iconRotation !== b.iconRotation,
      "appearance",
    );
    changed(
      [...a.categories].sort().join() !== [...b.categories].sort().join(),
      "categories",
    );
  } else if (before.kind === "check-in" && after.kind === "check-in") {
    changed(before.words !== after.words, "journal writing");
    changed(
      [...before.moods].sort().join() !== [...after.moods].sort().join(),
      "moods",
    );
    changed(
      before.energy !== after.energy ||
        before.energyScale !== after.energyScale,
      "energy",
    );
    changed(
      before.stress !== after.stress ||
        before.stressScale !== after.stressScale,
      "stress",
    );
    changed(
      before.sleepHours !== after.sleepHours ||
        before.bedtime !== after.bedtime,
      "sleep details",
    );
  } else if (before.kind === "goal" && after.kind === "goal") {
    changed(before.dailyLimitMg !== after.dailyLimitMg, "daily target");
    changed(
      before.startsOn !== after.startsOn || before.endsOn !== after.endsOn,
      "goal dates",
    );
  } else if (before.kind === "timezone" && after.kind === "timezone") {
    if (before.timeZone !== after.timeZone)
      return `Journal timezone changed to ${after.timeZone.replaceAll("_", " ")}.`;
  }
  if (!changes.length) return `${label} saved.`;
  const fields = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(changes);
  return `${fields[0].toUpperCase()}${fields.slice(1)} updated.`;
}

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
