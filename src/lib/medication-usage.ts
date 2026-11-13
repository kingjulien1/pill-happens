import type { Intake, Medication } from "./domain";

/** Most logged first; equal counts retain the saved library order. */
export function sortMedicationsByUsage(
  medications: readonly Medication[],
  intakes: readonly Pick<Intake, "medicationId">[],
): Medication[] {
  const usage = new Map(medications.map(({ id }) => [id, 0]));
  for (const { medicationId } of intakes) {
    const count = usage.get(medicationId);
    if (count !== undefined) usage.set(medicationId, count + 1);
  }
  return medications
    .map((medication, index) => ({
      medication,
      index,
      count: usage.get(medication.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ medication }) => medication);
}
