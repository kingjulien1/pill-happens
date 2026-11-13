import type { Intake, Medication } from "./domain";
import { getMedicationColor } from "./medication-appearance";
import { getMedicationClasses } from "./medication-classification";

/**
 * Saved-library order, with manually marked Benzos first.
 * All recorded intakes count once, independent of amount, age or archive state.
 * Invalid timestamps count as records but never contribute to the recency tie.
 */
function rankedMedications(
  medications: readonly Medication[],
  intakes: readonly Pick<Intake, "medicationId" | "takenAt">[],
): Medication[] {
  const candidates = new Map<
    string,
    {
      medication: Medication;
      index: number;
      benzo: boolean;
      records: number;
      latest: number;
    }
  >();
  medications.forEach((medication, index) => {
    if (candidates.has(medication.id)) return;
    candidates.set(medication.id, {
      medication,
      index,
      benzo: getMedicationClasses(medication).includes("benzodiazepine"),
      records: 0,
      latest: -Infinity,
    });
  });

  for (const intake of intakes) {
    const candidate = candidates.get(intake.medicationId);
    if (!candidate) continue;
    candidate.records += 1;
    const time = Date.parse(intake.takenAt);
    if (Number.isFinite(time))
      candidate.latest = Math.max(candidate.latest, time);
  }

  return [...candidates.values()]
    .sort(
      (first, second) =>
        Number(second.benzo) - Number(first.benzo) ||
        second.records - first.records ||
        (first.latest === second.latest ? 0 : second.latest - first.latest) ||
        first.index - second.index,
    )
    .map(({ medication }) => medication);
}

/** Original compact icon selection, retained for existing consumers. */
export function medicationKitPreview(
  medications: readonly Medication[],
  intakes: readonly Pick<Intake, "medicationId" | "takenAt">[],
): Medication[] {
  return rankedMedications(medications, intakes).slice(0, 3);
}

/** Up to six distinct saved pigments, in the same stable usage-based order. */
export function medicationKitPalette(
  medications: readonly Medication[],
  intakes: readonly Pick<Intake, "medicationId" | "takenAt">[],
) {
  const seen = new Set<string>();
  const colors: ReturnType<typeof getMedicationColor>[] = [];
  for (const medication of rankedMedications(medications, intakes)) {
    const color = getMedicationColor(medication.color);
    const pigment = color.hex.toLowerCase();
    if (seen.has(pigment)) continue;
    seen.add(pigment);
    colors.push(color);
    if (colors.length === 6) break;
  }
  return colors;
}
