import type { Intake } from "./domain";

type TimedIntake = { entry: Intake; at: number };
const timelines = new WeakMap<readonly Intake[], Map<string, TimedIntake[]>>();

/** Index each immutable server response once; time edits use a binary search. */
export function priorMedicationIntake(
  entries: readonly Intake[],
  medicationId: string,
  takenAt: string,
  excludeId?: string,
): Intake | undefined {
  const target = Date.parse(takenAt);
  if (!medicationId || !Number.isFinite(target)) return undefined;
  let medications = timelines.get(entries);
  if (!medications) {
    medications = new Map();
    for (const entry of entries) {
      const at = Date.parse(entry.takenAt);
      if (!Number.isFinite(at)) continue;
      let timeline = medications.get(entry.medicationId);
      if (!timeline) medications.set(entry.medicationId, (timeline = []));
      timeline.push({ entry, at });
    }
    for (const timeline of medications.values())
      timeline.sort(
        (a, b) => a.at - b.at || a.entry.id.localeCompare(b.entry.id),
      );
    timelines.set(entries, medications);
  }
  const timeline = medications.get(medicationId);
  if (!timeline) return undefined;
  let start = 0;
  let end = timeline.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (timeline[middle].at <= target) start = middle + 1;
    else end = middle;
  }
  for (let index = start - 1; index >= 0; index--)
    if (timeline[index].entry.id !== excludeId) return timeline[index].entry;
  return undefined;
}

/** Factual elapsed time between two records, with no suggested dosing interval. */
export function formatIntakeGap(earlier: string, later: string) {
  const elapsed = Date.parse(later) - Date.parse(earlier);
  if (!Number.isFinite(elapsed) || elapsed < 0) return undefined;
  if (elapsed === 0) return "Same time";
  if (elapsed < 60_000) return "< 1 min";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  return `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ""}`;
}
