import type { NotificationClockSnapshot } from "./journal-notification-lifecycle";

/** Progress interpolates in CSS; JavaScript only supplies five samples a second. */
export const NOTIFICATION_PAINT_INTERVAL = 200;
export const NOTIFICATION_CHECKPOINT_INTERVAL = 1_000;

/** Sleeping clocks have no polling timer; events wake them when their state changes. */
export function nextNotificationWake(
  snapshot: NotificationClockSnapshot,
  visible: boolean,
): number | null {
  if (
    snapshot.paused ||
    !visible ||
    snapshot.expired ||
    !Number.isFinite(snapshot.timeUntilComplete)
  )
    return null;
  if (snapshot.complete) return Math.max(1, snapshot.graceRemaining);
  const digitBoundary =
    snapshot.timeUntilComplete > 3_000
      ? snapshot.timeUntilComplete - 3_000
      : snapshot.timeUntilComplete % 1_000 || 1_000;
  return Math.max(
    1,
    Math.min(
      NOTIFICATION_PAINT_INTERVAL,
      digitBoundary,
      snapshot.timeUntilComplete,
    ),
  );
}
