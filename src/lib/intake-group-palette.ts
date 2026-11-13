import type { Intake, Medication } from "./domain";
import { getMedicationColor } from "./medication-appearance";

type GroupMedication = Pick<Medication, "id"> & { color?: string };

const angle = (degrees: number) => `${Number(degrees.toFixed(4))}deg`;

/** Current card colors, weighted by card count, in at most three paint layers. */
export function getIntakeGroupGradient(
  entries: readonly Pick<Intake, "medicationId">[],
  medications: readonly GroupMedication[],
): string {
  if (entries.length === 0) return "none";

  const byId = new Map<string, GroupMedication>();
  for (const medication of medications) {
    // Match the card's first linked medication if malformed legacy IDs repeat.
    if (!byId.has(medication.id)) byId.set(medication.id, medication);
  }
  const counts = new Map<string, number>();
  for (const entry of entries) {
    // This is also MedicationCardBase's missing/unknown-color fallback.
    const hex = getMedicationColor(byId.get(entry.medicationId)?.color).hex;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const colors = Array.from(counts, ([hex, count]) => ({ hex, count }));
  const highlights = [...colors]
    .sort((left, right) => right.count - left.count)
    .slice(0, 2)
    .map(
      ({ hex }, index) =>
        `radial-gradient(ellipse at ${index === 0 ? "22% 28%" : "78% 72%"}, ${hex} 0%, transparent 62%)`,
    );

  // Equal transition widths preserve each color's card-count share of the ring.
  // Colors retain first-card order; repeated entries never add paint layers.
  const blend = Math.min(
    30,
    ...colors.map(({ count }) => (count / entries.length) * 360 * 0.4),
  );
  let cursor = 0;
  const stops = colors.flatMap(({ hex, count }) => {
    const start = cursor;
    cursor += (count / entries.length) * 360;
    return [
      `${hex} ${angle(start + blend)}`,
      `${hex} ${angle(cursor - blend)}`,
    ];
  });
  // Extend the neighboring stops across 0/360 so rotation has no color seam.
  const cyclicStops = [
    `${colors.at(-1)!.hex} ${angle(-blend)}`,
    ...stops,
    `${colors[0].hex} ${angle(360 + blend)}`,
  ];
  return [
    ...highlights,
    `conic-gradient(from 35deg at 50% 50%, ${cyclicStops.join(", ")})`,
  ].join(", ");
}
