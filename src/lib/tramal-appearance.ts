import type { AppData } from "./domain";
import type { PersistedNotificationDescriptor } from "./journal-notification-descriptor";

export const TRAMAL_ICON = "svg:color:tramal";
export const TRAMAL_ICON_UPDATE = "tramal-bottle-v1";
/** Snapshots issued after this change already carry the saved appearance. */
export const TRAMAL_ICON_CUTOFF = Date.parse("2026-11-24T03:50:56.000Z");

export function isTramalMedicationName(name: string) {
  return /\btramal(?:\b|(?=\d))/i.test(name.normalize("NFKC"));
}

export function needsTramalIconUpdate(data: AppData) {
  return (
    !data.appearanceUpdates?.includes(TRAMAL_ICON_UPDATE) &&
    data.medications.some((medication) =>
      isTramalMedicationName(medication.name),
    )
  );
}

/** The saved appearance follows every linked intake, including archived history. */
export function applyTramalIconUpdate(data: AppData) {
  if (!needsTramalIconUpdate(data)) return;
  for (const medication of data.medications) {
    if (!isTramalMedicationName(medication.name)) continue;
    medication.icon = TRAMAL_ICON;
    medication.iconRotation = 0;
  }
  data.appearanceUpdates = [
    ...(data.appearanceUpdates ?? []),
    TRAMAL_ICON_UPDATE,
  ];
}

/** Refresh display-only snapshots; signed Undo receipts and recorded values stay intact. */
export function updateTramalNotification(
  descriptor: PersistedNotificationDescriptor,
  createdAt: number,
): PersistedNotificationDescriptor {
  const preview = descriptor.details?.preview;
  if (!preview || createdAt > TRAMAL_ICON_CUTOFF) return descriptor;
  let changed = false;
  const update = (record: typeof preview.before) => {
    if (
      !record ||
      !("medication" in record) ||
      !record.medication ||
      !isTramalMedicationName(record.medication.name)
    )
      return record;
    if (
      record.medication.icon === TRAMAL_ICON &&
      !record.medication.iconRotation
    )
      return record;
    changed = true;
    return {
      ...record,
      medication: { ...record.medication, icon: TRAMAL_ICON, iconRotation: 0 },
    };
  };
  const before = update(preview.before);
  const after = update(preview.after);
  return changed
    ? {
        ...descriptor,
        details: {
          ...descriptor.details,
          preview: { ...preview, before, after },
        },
      }
    : descriptor;
}
