export const CARD_ENTRY_SPACING_MS = 180;

type CardEntrySchedule = {
  delays: number[];
  nextAvailable: number;
};

/** Keep a real gap between starts instead of compressing a large batch. */
export function cardEntrySchedule(
  count: number,
  now: number,
  nextAvailable = now,
): CardEntrySchedule {
  const size = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const start = Math.max(now, nextAvailable);
  return {
    delays: Array.from(
      { length: size },
      (_, index) => start - now + index * CARD_ENTRY_SPACING_MS,
    ),
    nextAvailable: size ? start + size * CARD_ENTRY_SPACING_MS : start,
  };
}

const clocks = new WeakMap<Element, number>();
const scopeFor = (node: Element) =>
  node.closest("[data-log-entry-scope], [data-card-entry-scope]") ?? node;

/** Each daily log owns one clock; other card lists retain their page scope. */
export function reserveCardEntryDelays(node: Element, count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  const scope = scopeFor(node);
  const schedule = cardEntrySchedule(
    count,
    performance.now(),
    clocks.get(scope),
  );
  clocks.set(scope, schedule.nextAvailable);
  return schedule.delays;
}

/** Main faces share the page cadence; every stack's rear cascade owns its own clock. */
export function reserveTimelineCardEntryDelays<T>(
  node: Element,
  entries: readonly T[],
  stackFor: (entry: T) => Element | null,
  isHead: (entry: T) => boolean,
  rearClocks: WeakMap<Element, number>,
): number[] {
  const scope = scopeFor(node);
  const now = performance.now();
  const mainCount = entries.filter(
    (entry) => stackFor(entry) === null || isHead(entry),
  ).length;
  const main = cardEntrySchedule(mainCount, now, clocks.get(scope));
  // A rear-only scroll batch cannot reserve or prolong the shared sequence.
  if (mainCount) clocks.set(scope, main.nextAvailable);
  let mainIndex = 0;
  return entries.map((entry) => {
    const stack = stackFor(entry);
    if (stack === null || isHead(entry)) {
      const delay = main.delays[mainIndex++];
      if (stack !== null)
        rearClocks.set(
          stack,
          Math.max(
            rearClocks.get(stack) ?? now,
            now + delay + CARD_ENTRY_SPACING_MS,
          ),
        );
      return delay;
    }
    // Preserve absolute local reservations when more rear faces become visible.
    const start = Math.max(now, rearClocks.get(stack) ?? now);
    rearClocks.set(stack, start + CARD_ENTRY_SPACING_MS);
    return start - now;
  });
}

/** Delayed main faces still own slots; decorative rear tails never keep them alive. */
export function resetCardEntryDelaysIfIdle(node: Element): boolean {
  const scope = scopeFor(node);
  if (
    scope.querySelector(
      '[data-card-entry-state="running"], [data-intake-entrance][data-entrance-state="running"]:not([data-entrance-kind="rear"]):not([data-entrance-kind="preview"])',
    )
  )
    return false;
  clocks.delete(scope);
  return true;
}
