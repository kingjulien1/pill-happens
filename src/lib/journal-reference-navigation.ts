import { dayKey, type AppData } from "./domain";

export const JOURNAL_REFERENCE_REVEAL_EVENT = "pill:reveal-journal-intake";

/** Resolve against live timestamps: timezone changes must not strand a saved link. */
export function intakeReferenceDestination(
  data: AppData,
  id: string,
  now: Date,
): string | null {
  const entry = data.intakes.find((item) => item.id === id);
  if (!entry) return null;
  const day = dayKey(entry.takenAt, data.settings.timezone);
  const today = dayKey(now, data.settings.timezone);
  if (day > today || Date.parse(entry.takenAt) > now.getTime()) return null;
  return `${day === today ? "/" : `/history/${day}`}?${new URLSearchParams({ intake: id })}`;
}

/** Center in the usable viewport above Today's fixed action, within page bounds. */
export function referenceScrollTop({
  top,
  height,
  scrollY,
  viewportHeight,
  viewportOffset = 0,
  dockHeight = 0,
  maxScroll,
}: {
  top: number;
  height: number;
  scrollY: number;
  viewportHeight: number;
  viewportOffset?: number;
  dockHeight?: number;
  maxScroll: number;
}): number {
  const finite = (value: number) =>
    Number.isFinite(value) ? Math.max(0, value) : 0;
  const usable = Math.max(
    120,
    finite(viewportHeight) - finite(dockHeight) - 32,
  );
  const destination =
    scrollY +
    top -
    finite(viewportOffset) -
    16 -
    Math.max(0, (usable - finite(height)) / 2);
  return Math.max(
    0,
    Math.min(finite(maxScroll), Number.isFinite(destination) ? destination : 0),
  );
}
