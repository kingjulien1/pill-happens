import type { AppData } from "./domain";

/**
 * Medication details apply to every linked intake, including legacy entries.
 * Keep saved fallback details for entries whose medication is unavailable.
 * The original state and actual intake quantities/timestamps are never changed.
 */
export function withCurrentMedicationDetails(data: AppData): AppData {
  const medications = new Map(data.medications.map((item) => [item.id, item]));
  let changed = false;
  const intakes = data.intakes.map((intake) => {
    const medication = medications.get(intake.medicationId);
    if (
      !medication ||
      (intake.medicationName === medication.name &&
        intake.strengthMg === medication.strengthMg &&
        intake.medicationForm === medication.form)
    )
      return intake;
    changed = true;
    return {
      ...intake,
      medicationName: medication.name,
      strengthMg: medication.strengthMg,
      medicationForm: medication.form,
    };
  });
  return changed ? { ...data, intakes } : data;
}
