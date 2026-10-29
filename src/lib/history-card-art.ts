import type { DailyTotal, Medication } from "./domain";
import { getIntakeCardArt } from "./intake-card-art";
import { getMedicationColor } from "./medication-appearance";
import { getMedicationColorScale } from "./medication-preview-colors";

export type HistoryCardArt = {
  /** Up to four unique pigments belonging to medications recorded that day. */
  colors: string[];
  primary: string;
  secondary: string;
  tertiary: string;
  curves: string[];
  phaseSeconds: number;
  orbitAngle: number;
};

/** A day's decoration follows its medication colors, never combined drug doses. */
export function getHistoryCardArt(
  day: string,
  totals: readonly DailyTotal[],
  medications: readonly Medication[],
): HistoryCardArt {
  const medicationsById = new Map(
    medications.map((medication) => [medication.id, medication]),
  );
  const pigments = new Map<
    string,
    { value: string; hex: string; count: number; firstMedicationId: string }
  >();

  for (const total of totals) {
    const medication = medicationsById.get(total.medicationId);
    // Historical intakes can outlive their medication record. Match the daily
    // cards' original Ember fallback rather than borrowing another day's color.
    const color = getMedicationColor(medication?.color);
    const count = Number.isFinite(total.count) ? Math.max(0, total.count) : 0;
    const pigment = pigments.get(color.hex);
    if (pigment) {
      pigment.count += count;
      if (total.medicationId < pigment.firstMedicationId) {
        pigment.firstMedicationId = total.medicationId;
        pigment.value = color.value;
      }
    } else {
      pigments.set(color.hex, {
        value: color.value,
        hex: color.hex,
        count,
        firstMedicationId: total.medicationId,
      });
    }
  }

  const ranked = [...pigments.values()].sort(
    (left, right) =>
      right.count - left.count ||
      (left.firstMedicationId === right.firstMedicationId
        ? 0
        : left.firstMedicationId < right.firstMedicationId
          ? -1
          : 1),
  );
  const colors = ranked.slice(0, 4).map(({ hex }) => hex);
  const primary = colors[0] ?? getMedicationColor().hex;
  const scale = getMedicationColorScale(ranked[0]?.value);
  const art = getIntakeCardArt(day);

  return {
    colors,
    primary,
    // A single pigment gets adjacent shades from its own ramp. Mixed days use
    // only the recorded pigments; a two-color blend repeats its primary.
    secondary: colors.length > 1 ? colors[1] : scale.lighter,
    tertiary: colors.length > 1 ? (colors[2] ?? primary) : scale.darker,
    curves: [art.curveA, art.curveB],
    phaseSeconds: art.phaseSeconds,
    orbitAngle: art.orbitAngle,
  };
}
