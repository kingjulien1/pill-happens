import type { Intake } from "./domain";

export type IntakeGroup = {
  /** Earliest-taken member; backdating or time edits can legitimately regroup. */
  id: string;
  entries: Intake[];
};

const TAKEN_WINDOW_MS = 13 * 60 * 1_000;

/**
 * Order a copy by time taken, keeping source order for equal instants. Each
 * 13-minute window extends from the most recent member, so a group continues
 * while consecutive intakes are at most 13 minutes apart. Creation times never
 * determine grouping or display order.
 * Invalid taken times remain separate singletons after the valid timeline.
 */
export function groupIntakes(entries: readonly Intake[]): IntakeGroup[] {
  const ordered = entries
    .map((entry) => ({ entry, takenAt: Date.parse(entry.takenAt) }))
    .sort((left, right) => {
      if (!Number.isFinite(left.takenAt))
        return Number.isFinite(right.takenAt) ? 1 : 0;
      if (!Number.isFinite(right.takenAt)) return -1;
      return left.takenAt - right.takenAt;
    });
  const groups: IntakeGroup[] = [];
  let current: IntakeGroup | undefined;
  let lastTakenAt = Number.NaN;

  for (const { entry, takenAt } of ordered) {
    if (!Number.isFinite(takenAt)) {
      groups.push({ id: entry.id, entries: [entry] });
      current = undefined;
      continue;
    }

    if (current && takenAt - lastTakenAt <= TAKEN_WINDOW_MS) {
      current.entries.push(entry);
    } else {
      current = { id: entry.id, entries: [entry] };
      groups.push(current);
    }
    lastTakenAt = takenAt;
  }

  return groups;
}
