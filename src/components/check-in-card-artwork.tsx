"use client";

import { useEffect, useId, useState } from "react";
import { CardIconSettle } from "@/components/card-icon-settle";
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
  return (
    <ArtworkScene
      key={`${period}:${replayKey}`}
      period={period}
      dialogOpen={dialogOpen}
    />
  );
}

/** A keyed scene owns its arrival and the later ambient handoff together. */
function ArtworkScene({
  period,
  dialogOpen,
}: {
  period: "morning" | "evening";
  dialogOpen: boolean;
}) {
  const id = useId();
  const [ambientReady, setAmbientReady] = useState(false);
  const morning = period === "morning";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resetAmbient = () => setAmbientReady(false);
    reduced.addEventListener("change", resetAmbient);
    return () => reduced.removeEventListener("change", resetAmbient);
  }, []);

  return (
    <span
      className={styles.stage}
      data-check-in-artwork={period}
      data-artwork-dialog-open={dialogOpen}
      data-artwork-ambient-ready={ambientReady}
      aria-hidden="true"
    >
      <span
        className={styles.ambientGate}
        data-check-in-ambient-gate
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setAmbientReady(true);
        }}
      />
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
          </svg>
          <span className={styles.symbolArrival}>
            <span className={styles.symbolFloat}>
              {morning ? (
                <MorningCoffee
                  dialogOpen={dialogOpen}
                  ambientReady={ambientReady}
                />
              ) : (
                <EveningMoon
                  dialogOpen={dialogOpen}
                  ambientReady={ambientReady}
                />
              )}
            </span>
          </span>
        </span>
      </span>
      <CardIconSettle owner="check-in" />
      <svg className={styles.flourish} viewBox="0 0 56 56" fill="none">
        <path d="M47 4v4m-2-2h4" />
        <path d="M5 44v3m-1.5-1.5h3" />
      </svg>
    </span>
  );
}
