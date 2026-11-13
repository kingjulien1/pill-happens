"use client";

import { useId } from "react";
import { EveningMoon } from "@/components/evening-moon";
import { MorningCoffee } from "@/components/morning-coffee";
import styles from "./check-in-card-artwork.module.css";

/** A small illustrated companion; the card remains the only interactive target. */
export function CheckInCardArtwork({
  period,
  replayKey,
  dialogOpen = false,
}: {
  period: "morning" | "evening";
  replayKey: string;
  dialogOpen?: boolean;
}) {
  const id = useId();
  const morning = period === "morning";

  return (
    <span
      key={replayKey}
      className={styles.stage}
      data-check-in-artwork={period}
      data-artwork-dialog-open={dialogOpen}
      aria-hidden="true"
    >
      <span className={styles.halo} />
      <span className={styles.arrival}>
        <span className={styles.tile} data-check-in-icon-tile>
          <span className={styles.wash} />
          <svg className={styles.frame} viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient
                id={id}
                x1="3"
                y1="5"
                x2="42"
                y2="43"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="var(--check-in-secondary, var(--action-background))" />
                <stop offset=".5" stopColor="var(--palette-lilac)" />
                <stop
                  offset="1"
                  stopColor="var(--check-in-secondary, var(--action-background))"
                />
              </linearGradient>
            </defs>
            <rect
              className={styles.frameTrace}
              x="2.5"
              y="2.5"
              width="43"
              height="43"
              rx="14"
              pathLength="100"
              stroke={`url(#${id})`}
            />
            <g className={styles.glints}>
              <circle cx="12" cy="3.8" r="1.35" />
              <circle cx="44.2" cy="34" r="1.1" />
            </g>
          </svg>
          <span className={styles.symbolArrival}>
            <span className={styles.symbolFloat}>
              {morning ? (
                <MorningCoffee dialogOpen={dialogOpen} />
              ) : (
                <EveningMoon dialogOpen={dialogOpen} />
              )}
            </span>
          </span>
        </span>
      </span>
      <svg className={styles.flourish} viewBox="0 0 56 56" fill="none">
        <path d="M47 4v4m-2-2h4" />
        <path d="M5 44v3m-1.5-1.5h3" />
        <circle cx="49" cy="47" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
