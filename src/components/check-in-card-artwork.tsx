"use client";

import { useEffect, useState } from "react";
import { CardIconSettle } from "@/components/card-icon-settle";
import { MedicationCardIconFrame } from "@/components/medication-card-icon";
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
      <span className={styles.arrival}>
        <MedicationCardIconFrame
          color="tw-purple-400"
          className={styles.tile}
          data-check-in-icon-tile
        >
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
        </MedicationCardIconFrame>
      </span>
      <CardIconSettle owner="check-in" />
      <svg className={styles.flourish} viewBox="0 0 56 56" fill="none">
        <path d="M47 4v4m-2-2h4" />
        <path d="M5 44v3m-1.5-1.5h3" />
        <circle cx="49" cy="47" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
