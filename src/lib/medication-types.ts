/** Medication presentation and counted units, independent of its appearance icon. */
export const MEDICATION_TYPE_VALUES = [
  "tablet",
  "capsule",
  "drops",
  "pump",
  "pump-bottle",
  "gel-dispenser",
  "other",
] as const;

export type MedicationType = (typeof MEDICATION_TYPE_VALUES)[number];

const details = {
  tablet: { label: "Tablet", unit: "tablet", units: "tablets" },
  capsule: { label: "Capsule", unit: "capsule", units: "capsules" },
  drops: { label: "Drops", unit: "drop", units: "drops" },
  pump: { label: "Metered Pump", unit: "pump", units: "pumps" },
  "pump-bottle": { label: "Pump Bottle", unit: "pump", units: "pumps" },
  "gel-dispenser": { label: "Gel Dispenser", unit: "pump", units: "pumps" },
  other: { label: "Other", unit: "unit", units: "units" },
} as const satisfies Record<
  MedicationType,
  { label: string; unit: string; units: string }
>;

export const MEDICATION_TYPES = MEDICATION_TYPE_VALUES.map((value) => ({
  value,
  ...details[value],
}));

export function getMedicationType(type?: MedicationType) {
  return details[type ?? "other"];
}

/** Metered dispensers count pump actuations; tablet fractions stay available. */
export function isMeteredMedicationType(type?: MedicationType) {
  return type === "pump" || type === "pump-bottle" || type === "gel-dispenser";
}

export function medicationQuantityControls(type?: MedicationType) {
  return isMeteredMedicationType(type)
    ? { increment: 1, presets: [1, 2, 3, 4] }
    : { increment: 0.25, presets: [0.25, 0.5, 1, 2] };
}
