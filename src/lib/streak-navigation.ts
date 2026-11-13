import { streakMilestone, type loggingStreak } from "./logging-streak";

export type StreakNavigationState = {
  kind: "idle" | "active" | "milestone";
  current: number;
  target: number | null;
  next: number;
  remaining: number;
};

/** Presentation only: yesterday's grace period never invents an achievement today. */
export function getStreakNavigationState(
  streak: Pick<
    ReturnType<typeof loggingStreak>,
    "current" | "loggedToday" | "milestone" | "nextMilestone"
  > | null,
): StreakNavigationState {
  const current =
    streak && Number.isSafeInteger(streak.current) && streak.current > 0
      ? streak.current
      : 0;
  const { reached, next } = streakMilestone(current);
  const milestoneToday =
    current > 0 &&
    streak?.loggedToday === true &&
    streak.milestone === current &&
    reached === current;
  return {
    kind: current === 0 ? "idle" : milestoneToday ? "milestone" : "active",
    current,
    target: current === 0 ? null : (reached ?? next),
    next,
    remaining: next - current,
  };
}
