import type { Intake } from "./domain";

export type IntakeGroup = {
  /** The first recorded entry keeps this group's identity stable on append. */
  id: string;
  entries: Intake[];
};

const RECORDING_WINDOW_MS = 5 * 60 * 1_000;

/**
 * Group an already creation-ordered timeline without changing any intake.
 * Each window starts at its first saved entry, rather than extending whenever
 * another entry arrives. takenAt, doses, and calendar boundaries play no part.
 * Invalid or backward timestamps start a separate group without reordering.
 */
export function groupIntakes(entries: readonly Intake[]): IntakeGroup[] {
  const groups: IntakeGroup[] = [];
  let current: IntakeGroup | undefined;
  let windowStart = Number.NaN;
  let previousTime = Number.NaN;

  for (const entry of entries) {
    const recordedAt = Date.parse(entry.createdAt);

    if (!Number.isFinite(recordedAt)) {
      groups.push({ id: entry.id, entries: [entry] });
      // An unknown save time cannot connect the groups on either side of it.
      current = undefined;
      continue;
    }

    if (
      current &&
      recordedAt >= previousTime &&
      recordedAt - windowStart <= RECORDING_WINDOW_MS
    ) {
      current.entries.push(entry);
    } else {
      current = { id: entry.id, entries: [entry] };
      groups.push(current);
      windowStart = recordedAt;
    }

    previousTime = recordedAt;
  }

  return groups;
}
