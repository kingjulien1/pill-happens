import type { NotificationId } from "./journal-notification-lifecycle";

export const NOTIFICATION_MAX_ACTIVE = 20;
export const NOTIFICATION_STACK_GAP = 10;
export const NOTIFICATION_STACK_CHANGE_EVENT =
  "pill-happens:notification-stack-change";

/** Capture a reader's position before a new host changes the native list. */
export function prepareNotificationStackChange() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(NOTIFICATION_STACK_CHANGE_EVENT));
}

type Candidate = { id: NotificationId; admitted: boolean; removed: boolean };

/** Existing slots include outgoing cards until their native hosts unmount. */
export function notificationAdmissions(
  candidates: readonly Candidate[],
  retiring = 0,
): NotificationId[] {
  let available = Math.max(
    0,
    NOTIFICATION_MAX_ACTIVE -
      retiring -
      candidates.filter((entry) => entry.admitted).length,
  );
  const next: NotificationId[] = [];
  for (const entry of candidates) {
    if (!available) break;
    if (!entry.admitted && !entry.removed) {
      next.push(entry.id);
      available--;
    }
  }
  return next;
}

const empty = Object.freeze({ active: 0, waiting: 0 });
let snapshot: Readonly<{ active: number; waiting: number }> = empty;
const listeners = new Set<() => void>();
export const getNotificationQueueSnapshot = () => snapshot;
export const getServerNotificationQueueSnapshot = () => empty;
export function subscribeNotificationQueue(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function publishNotificationQueue(active: number, waiting: number) {
  if (snapshot.active === active && snapshot.waiting === waiting) return;
  snapshot = Object.freeze({ active, waiting });
  listeners.forEach((listener) => listener());
}

const retiring = new Set<string>();
const released = new Set<() => void>();
export const retiringNotificationCount = () => retiring.size;
export const retiringNotificationHosts = () => [...retiring];
export function retireNotificationHost(id: string) {
  retiring.add(id);
}
export function releaseNotificationHost(id: string) {
  if (retiring.delete(id)) released.forEach((listener) => listener());
}
export function subscribeNotificationSlotRelease(listener: () => void) {
  released.add(listener);
  return () => {
    released.delete(listener);
  };
}

/** IntersectionObserver includes ancestor clipping, not just the page viewport. */
export function notificationIsFullyVisible(
  intersecting: boolean,
  ratio: number,
) {
  return intersecting && Number.isFinite(ratio) && ratio >= 1 - 1e-7;
}

/** A delivery can contain several positions for one target; use its latest one. */
export function notificationVisibilityAfterBatch<T>(
  previous: { fullyVisible: boolean; headerVisible: boolean },
  entries: readonly {
    target: T;
    isIntersecting: boolean;
    intersectionRatio: number;
    boundingClientRect?: { width: number; height: number };
  }[],
  card: T,
  header?: T,
) {
  const next = { ...previous };
  for (const entry of entries) {
    const box = entry.boundingClientRect;
    const intersects =
      entry.isIntersecting && (!box || (box.width > 0 && box.height > 0));
    if (entry.target === card) {
      next.fullyVisible = notificationIsFullyVisible(
        intersects,
        entry.intersectionRatio,
      );
      if (header === undefined) next.headerVisible = intersects;
    } else if (entry.target === header) next.headerVisible = intersects;
  }
  return next;
}
