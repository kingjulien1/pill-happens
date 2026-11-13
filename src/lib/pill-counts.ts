import type { Intake, Medication } from "./domain";
import { getMedicationCategories } from "./medication-categories";
import { getMedicationClasses } from "./medication-classification";

export type PillCounts = { pills: number; benzos: number };

const clean = (value: number) => Number(value.toFixed(8));

/** One eligibility rule for every pill counter; saved form and first metadata win. */
function* pillEntries(
  entries: readonly Intake[],
  medications: readonly Medication[],
) {
  const catalog = new Map<string, Medication>();
  for (const medication of medications) {
    if (!catalog.has(medication.id)) catalog.set(medication.id, medication);
  }
  for (const entry of entries) {
    if (!Number.isFinite(entry.quantity) || entry.quantity <= 0) continue;
    const medication = catalog.get(entry.medicationId);
    const form = entry.medicationForm ?? medication?.form;
    if (form !== "tablet" && form !== "capsule") continue;
    yield { quantity: entry.quantity, medication };
  }
}

/** Count recorded tablet/capsule quantities; Benzo is a subset, never a dose sum. */
export function countPills(
  entries: readonly Intake[],
  medications: readonly Medication[],
): PillCounts {
  let pills = 0;
  let benzos = 0;
  for (const { quantity, medication } of pillEntries(entries, medications)) {
    pills = clean(pills + quantity);
    if (getMedicationClasses(medication).includes("benzodiazepine"))
      benzos = clean(benzos + quantity);
  }
  return { pills, benzos };
}

/** Opioid tablet/capsule units, independent of the existing two-count display API. */
export function countOpioidPills(
  entries: readonly Intake[],
  medications: readonly Medication[],
): number {
  let opioids = 0;
  for (const { quantity, medication } of pillEntries(entries, medications)) {
    if (getMedicationClasses(medication).includes("opioid"))
      opioids = clean(opioids + quantity);
  }
  return opioids;
}

/** Stimulant tablet/capsule units use explicit categories, never inferred names. */
export function countStimulantPills(
  entries: readonly Intake[],
  medications: readonly Medication[],
): number {
  let stimulants = 0;
  for (const { quantity, medication } of pillEntries(entries, medications)) {
    if (getMedicationCategories(medication).includes("stimulant"))
      stimulants = clean(stimulants + quantity);
  }
  return stimulants;
}
