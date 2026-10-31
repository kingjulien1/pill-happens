"use client";

import { isStreakMilestoneTarget } from "@/lib/streak-milestones";

export const STREAK_SPOTLIGHT_EVENT = "pill:streak-spotlight";
const historyKey = "pillStreakSpotlightPlayed";

/** Only a history-entry marker is stored; no journal records or credentials. */
export function hasPlayedStreakSpotlight(target: number): boolean {
  try {
    return window.history.state?.[historyKey] === target;
  } catch {
    return false;
  }
}

export function markStreakSpotlightPlayed(target: number) {
  try {
    const url = new URL(window.location.href);
    if (
      url.pathname !== "/streaks" ||
      url.searchParams.get("spotlight") !== String(target)
    )
      return;
    window.history.replaceState(
      { ...window.history.state, [historyKey]: target },
      "",
    );
  } catch {
    // Local component state still prevents replay if browser history is blocked.
  }
}

/** Explicit same-page activation can replay; ordinary refresh/back does not. */
export function requestStreakSpotlight(target: number) {
  if (!isStreakMilestoneTarget(target)) return;
  const url = new URL(window.location.href);
  // Preserve a different milestone's consumed marker when leaving its entry.
  if (
    url.pathname !== "/streaks" ||
    url.searchParams.get("spotlight") !== String(target)
  )
    return;
  try {
    const state = { ...window.history.state };
    delete state[historyKey];
    window.history.replaceState(state, "");
  } catch {
    // Navigation and the in-page event remain usable with restricted history.
  }
  window.dispatchEvent(
    new CustomEvent(STREAK_SPOTLIGHT_EVENT, { detail: target }),
  );
}
