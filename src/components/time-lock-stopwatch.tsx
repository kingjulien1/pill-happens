"use client";

import { useVisibleMotion } from "./use-visible-motion";
import styles from "./time-lock-stopwatch.module.css";

export function TimeLockStopwatch({ pinned }: { pinned: boolean }) {
  const ref = useVisibleMotion<HTMLSpanElement>(true);
  return (
    <span ref={ref} className={styles.watch}>
      <svg
        className={styles.drawing}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <g className={styles.case}>
          <g className={styles.crown}>
            <path d="M16 3.8v2.8" strokeWidth="1.8" />
            <path d="M13 2.5h6" strokeWidth="2.9" />
          </g>
          <circle cx="16" cy="18" r="11.15" strokeWidth="2.85" />
          <g className={styles.indices} strokeWidth="1.25">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <path
                key={angle}
                transform={`rotate(${angle} 16 18)`}
                d={angle % 90 === 0 ? "M16 9.9v1.4" : "M16 9.9v.55"}
              />
            ))}
          </g>
          <circle className={styles.echo} cx="16" cy="18" r="8" />
          {pinned && (
            <path
              className={styles.splitHand}
              d="m16 18 4.1-4.1"
              strokeWidth="1.9"
            />
          )}
          <g className={styles.rotor}>
            <path
              className={styles.trail}
              d="M11.6 11.7a7.7 7.7 0 0 1 9.85.85"
              pathLength="1"
              strokeWidth="1.5"
            />
            <path d="m14.6 19.4 5.8-5.8" strokeWidth="2.95" />
          </g>
          <circle
            cx="16"
            cy="18"
            r="1.05"
            fill="var(--watch-accent)"
            stroke="none"
          />
        </g>
      </svg>
    </span>
  );
}
