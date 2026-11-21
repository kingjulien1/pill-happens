import {
  BRAND_REFRESH_SLOP,
  BRAND_REFRESH_THRESHOLD,
  brandPullOffset,
  getBrandPullThresholds,
} from "./brand-refresh";

export const NOTIFICATION_PULL_THRESHOLD = BRAND_REFRESH_THRESHOLD / 3;
export const NOTIFICATION_PULL_RECOIL = 150;
export const NOTIFICATION_PULL_OPEN_DURATION = 700;

export type NotificationPullState = {
  intent: "pending" | "pull" | "native";
  distance: number;
  progress: number;
  ready: boolean;
};

export function notificationPullThreshold(
  x: number,
  y: number,
  right: number,
  bottom: number,
) {
  return getBrandPullThresholds(x, y, right, bottom).refresh / 3;
}

/** Keep native swipe ownership once chosen; a claimed downward pull can retract. */
export function updateNotificationPull(
  previous: NotificationPullState,
  x: number,
  y: number,
  threshold: number,
): NotificationPullState {
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return { ...previous, distance: 0, progress: 0, ready: false };
  let intent = previous.intent;
  if (intent === "pending" && Math.hypot(x, y) > BRAND_REFRESH_SLOP) {
    if (y > Math.abs(x) * 1.5) intent = "pull";
    else if (y < -BRAND_REFRESH_SLOP || Math.abs(x) > Math.abs(y) * 1.5)
      intent = "native";
  }
  const limit =
    Number.isFinite(threshold) && threshold > 0
      ? threshold
      : NOTIFICATION_PULL_THRESHOLD;
  const distance =
    intent === "pull" || (intent === "pending" && y > Math.abs(x))
      ? Math.max(0, y)
      : 0;
  return {
    intent,
    distance,
    progress: Math.min(1, distance / limit),
    ready: intent === "pull" && distance >= limit,
  };
}

/** Match the branding resistance and its 84px visual cap at one-third scale. */
export function notificationPullOffset(distance: number) {
  return brandPullOffset(Number.isFinite(distance) ? distance * 3 : 0) / 3;
}
