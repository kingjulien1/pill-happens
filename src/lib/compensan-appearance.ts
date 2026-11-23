import type { AppData, Medication } from "./domain";
import type { PersistedNotificationDescriptor } from "./journal-notification-descriptor";

export const COMPENSAN_ICON = "svg:color:compensan";
export const COMPENSAN_ICON_UPDATE = "compensan-svg-v1";
/** Existing records only; future selections and later manual edits stay authoritative. */
export const COMPENSAN_ICON_CUTOFF = Date.parse("2026-11-23T16:42:20.719Z");

export function isCompensanMedicationName(name: string) {
  return /\bcompensan(?:\b|(?=\d))/i.test(name.normalize("NFKC"));
}

function existingCompensan(medication: Medication) {
  const created = Date.parse(medication.createdAt);
  return (
    isCompensanMedicationName(medication.name) &&
    (!Number.isFinite(created) || created <= COMPENSAN_ICON_CUTOFF)
  );
}

export function needsCompensanIconUpdate(data: AppData) {
  return (
    !data.appearanceUpdates?.includes(COMPENSAN_ICON_UPDATE) &&
    data.medications.some(existingCompensan)
  );
}

/** Run inside the journal repository's existing compare-and-swap transaction. */
export function applyCompensanIconUpdate(data: AppData) {
  if (!needsCompensanIconUpdate(data)) return;
  for (const medication of data.medications.filter(existingCompensan)) {
    medication.icon = COMPENSAN_ICON;
    // The rotation is in the shared geometry, not an extra display transform.
    medication.iconRotation = 0;
  }
  data.appearanceUpdates = [
    ...(data.appearanceUpdates ?? []),
    COMPENSAN_ICON_UPDATE,
  ];
}

/** Old saved notices own snapshots, so update their display data on restoration. */
export function updateCompensanNotification(
  descriptor: PersistedNotificationDescriptor,
  createdAt: number,
): PersistedNotificationDescriptor {
  const preview = descriptor.details?.preview;
  if (!preview || createdAt > COMPENSAN_ICON_CUTOFF) return descriptor;
  let changed = false;
  const update = (record: typeof preview.before) => {
    if (
      !record ||
      !("medication" in record) ||
      !record.medication ||
      !isCompensanMedicationName(record.medication.name)
    )
      return record;
    changed = true;
    return {
      ...record,
      medication: {
        ...record.medication,
        icon: COMPENSAN_ICON,
        iconRotation: 0,
      },
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
