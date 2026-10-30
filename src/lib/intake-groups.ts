import type { Intake } from "./domain";

export type IntakeGroup = {
  /** Earliest-taken member; backdating or time edits can legitimately regroup. */
  id: string;
  entries: Intake[];
};

const TAKEN_WINDOW_MS = 5 * 60 * 1_000;

/**
 * Order a copy by time taken, keeping source order for equal instants. Each
 * five-minute window starts at its earliest intake rather than extending with
 * later members. Creation times never determine grouping or display order.
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
  let windowStart = Number.NaN;

  for (const { entry, takenAt } of ordered) {
    if (!Number.isFinite(takenAt)) {
      groups.push({ id: entry.id, entries: [entry] });
      current = undefined;
      continue;
    }

    if (current && takenAt - windowStart <= TAKEN_WINDOW_MS) {
      current.entries.push(entry);
    } else {
      current = { id: entry.id, entries: [entry] };
      groups.push(current);
      windowStart = takenAt;
    }
  }

  return groups;
}
