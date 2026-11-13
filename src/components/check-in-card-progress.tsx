"use client";

import { useId, type CSSProperties } from "react";
import type { getCheckInCardProgress } from "@/lib/check-in-card-progress";
import styles from "./check-in-card-progress.module.css";

/** Compact section completion; the whole card opens its editor. */
export function CheckInCardProgress({
  progress,
  dormant,
  period,
  replayKey,
  dialogOpen,
}: {
  progress: ReturnType<typeof getCheckInCardProgress>;
  dormant: boolean;
  period: "morning" | "evening";
  replayKey: string;
  dialogOpen: boolean;
}) {
  const gradientId = useId();
  const { percent, completion } = progress;
  // A small invitation stroke is presentation only: no completed section or
  // percentage is awarded before the user has supplied any answers.
  const arcPercent = dormant ? 6 : percent;
  const label = `${percent}% complete · ${completion.completedCount} of ${completion.totalCount} optional sections${completion.complete ? " · All filled" : ""}`;

  return (
    <span
      key={replayKey}
      className={styles.progress}
      data-check-in-progress
      data-progress-period={period}
      data-progress-percent={percent}
      data-progress-dormant={dormant}
      data-progress-cycle={replayKey}
      data-progress-dialog-open={dialogOpen}
      data-progress-complete={completion.complete}
      role="img"
      aria-label={label}
      title={label}
    >
      <span
        className={styles.artwork}
        data-check-in-progress-artwork
        aria-hidden="true"
        style={{ "--progress-offset": 100 - arcPercent } as CSSProperties}
      >
        <span className={styles.halo} />
        <svg className={styles.orb} viewBox="0 0 36 36" fill="none">
          <defs>
            <linearGradient
              id={gradientId}
              x1="5"
              y1="3"
              x2="31"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="var(--check-in-secondary, var(--action-background))" />
              <stop offset=".38" stopColor="var(--palette-lilac)" />
              <stop
                offset=".7"
                stopColor="var(--check-in-secondary, var(--action-background))"
              />
              <stop offset="1" stopColor="#eee8f8" />
            </linearGradient>
          </defs>
          <circle className={styles.track} cx="18" cy="18" r="13" />
          <circle
            className={styles.arc}
            cx="18"
            cy="18"
            r="13"
            pathLength="100"
            stroke={`url(#${gradientId})`}
            strokeDasharray="100"
            strokeDashoffset={100 - arcPercent}
            transform="rotate(-90 18 18)"
          />
          <g className={styles.sections}>
            {completion.sections.map((section, index) => {
              const angle =
                (((index / completion.totalCount) * 360 - 90) * Math.PI) / 180;
              return (
                <circle
                  key={section.id}
                  cx={18 + Math.cos(angle) * 13}
                  cy={18 + Math.sin(angle) * 13}
                  r={section.complete ? 1.8 : 1.15}
                  className={styles.sectionDot}
                  data-section-complete={section.complete}
                  style={{ "--section-index": index } as CSSProperties}
                />
              );
            })}
          </g>
          <g className={styles.confetti}>
            <path d="M30 4v4m-2-2h4" stroke="var(--palette-lilac)" />
            <path
              d="M4 27v4m-2-2h4"
              stroke="var(--check-in-secondary, var(--action-background))"
            />
            <circle
              cx="30"
              cy="29"
              r="1.2"
              fill="var(--check-in-secondary, var(--action-background))"
              stroke="none"
            />
          </g>
        </svg>
        <span className={styles.copy} data-check-in-progress-copy>
          <span className={styles.numberMotion}>
            <span className={styles.value}>{percent}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
