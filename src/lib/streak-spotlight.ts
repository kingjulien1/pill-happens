import { streakMilestone } from "@/lib/logging-streak";
import { isStreakMilestoneTarget } from "@/lib/streak-milestones";

export type StreakSpotlight = {
  target: number;
  /** Current-run progress is separate from a milestone earned in an older run. */
  reachedInCurrentRun: boolean;
  href: string;
};

/** Only local links to real, safely represented milestone IDs are constructed. */
export function streakSpotlightHref(target: number): string {
  return isStreakMilestoneTarget(target)
    ? `/streaks?spotlight=${target}#milestone-${target}`
    : "/streaks";
}

/**
 * A spotlight is navigation intent, never evidence of an achievement. Accept
 * canonical decimal query values only; arrays and URL-shaped input are ignored.
 */
export function parseStreakSpotlightTarget(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const target = Number(value);
  return isStreakMilestoneTarget(target) ? target : null;
}

/**
 * Spotlight the current run's reached step, or its first upcoming step. A best
 * run can place this card outside the default latest-three list; callers may
 * render that card using getStreakMilestone without changing its achieved state.
 */
export function getStreakSpotlight(streak: {
  current: number;
}): StreakSpotlight {
  const count = Math.max(0, Math.floor(streak.current));
  const current = Number.isSafeInteger(count) ? count : 0;
  const { reached, next } = streakMilestone(current);
  const target = reached ?? next;
  return {
    target,
    reachedInCurrentRun: reached !== null,
    href: streakSpotlightHref(target),
  };
}
