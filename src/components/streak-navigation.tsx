import type { CSSProperties } from "react";
import { ArrowUpRight, CircleCheck } from "lucide-react";
import { getMilestoneLook } from "@/lib/streak-milestones";
import type { getStreakNavigationState } from "@/lib/streak-navigation";
import styles from "./streak-navigation.module.css";

type StreakNavigationState = ReturnType<typeof getStreakNavigationState>;

/** Milestone pigments remain inside the Streaks invitation artwork. */
export function getStreakNavigationStyle(state: StreakNavigationState) {
  const { palette } = getMilestoneLook(state.target ?? state.next);
  return {
    "--streak-nav-accent": palette.accent,
    "--streak-nav-pop": palette.pop,
    "--streak-nav-spark": palette.spark,
  } as CSSProperties;
}

export function getStreakNavigationLabel(state: StreakNavigationState) {
  const days = `${state.current} consecutive logging ${state.current === 1 ? "day" : "days"}`;
  const milestone =
    state.kind === "milestone"
      ? ` ${state.current}-day milestone reached today.`
      : "";
  return `Streaks: ${days}.${milestone} ${state.remaining} ${state.remaining === 1 ? "day" : "days"} to the next ${state.next}-day milestone. Open Streaks and spotlight the ${state.target ?? state.next}-day milestone.`;
}

/** One link's noninteractive content; the menu remains the navigation owner. */
export function StreakNavigationCard({
  state,
  selected = false,
}: {
  state: StreakNavigationState;
  selected?: boolean;
}) {
  const milestone = state.kind === "milestone";
  const look = getMilestoneLook(state.target ?? state.next);
  const percentage = Math.min(
    100,
    Math.max(0, (state.current / state.next) * 100),
  );
  return (
    <>
      <svg
        className={styles.weave}
        viewBox="0 0 360 112"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M-25 96C52-27 105 10 171 75S298 133 385 14" />
        <path d="M-25 28C64 125 112 127 198 43S304-1 385 75" />
      </svg>
      <span
        className={styles.medallion}
        aria-hidden="true"
        data-streak-day-medallion
      >
        <strong data-long={String(state.current).length > 3 || undefined}>
          {state.current}
        </strong>
        <span>{state.current === 1 ? "day" : "days"}</span>
      </span>
      <span className={styles.copy}>
        <span className={styles.titleRow}>
          <span className={styles.title}>Streaks</span>
          {milestone && (
            <span className={styles.status} title={look.title}>
              Milestone · {look.title}
            </span>
          )}
        </span>
        <span className={styles.next}>
          <span>
            {state.remaining} {state.remaining === 1 ? "day" : "days"} to next
          </span>
          <strong>{state.next} days</strong>
        </span>
        <span
          className={styles.progress}
          role="progressbar"
          aria-label="Progress to the next logging milestone"
          aria-valuemin={0}
          aria-valuemax={state.next}
          aria-valuenow={state.current}
        >
          <span style={{ width: `${percentage}%` }} />
        </span>
      </span>
      <span className={styles.direction} aria-hidden="true">
        {milestone || selected ? (
          <CircleCheck strokeWidth={2.3} />
        ) : (
          <ArrowUpRight className={styles.arrow} strokeWidth={2.3} />
        )}
      </span>
    </>
  );
}
