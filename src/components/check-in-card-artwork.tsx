"use client";

import { useEffect, useState } from "react";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import { CardIconSettle } from "@/components/card-icon-settle";
import { MedicationCardIconFrame } from "@/components/medication-card-icon";
import { EveningMoon } from "@/components/evening-moon";
import { MorningCoffee } from "@/components/morning-coffee";
import styles from "./check-in-card-artwork.module.css";

export const CHECK_IN_CARD_COLOR = {
  morning: "tw-orange-400",
  evening: "tw-indigo-400",
} as const;

/** A quiet horizon behind the readings, clipped by the shared card frame. */
export function CheckInCardSurface({ period }: { period: DailyCheckInPeriod }) {
  return (
    <span
      className={styles.surface}
      data-check-in-background
      aria-hidden="true"
    >
      <svg viewBox="0 0 140 72" fill="none" focusable="false">
        {period === "morning" ? (
          <g stroke="currentColor" strokeLinecap="round">
            <path d="M12 49h117M36 55h53m7 0h13M54 61h26" />
            <path d="M53 48a20 20 0 0 1 40 0" strokeWidth="1.6" />
            <path d="M73 17v-6m16 11 4-6m7 17 6-3m-49-8-4-6m-7 17-6-3" />
          </g>
        ) : (
          <g fill="currentColor">
            <path
              d="m11 51 25-14 27 6 21-24 27 10 17-15"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".65"
            />
            <circle cx="11" cy="51" r="1.6" />
            <circle cx="36" cy="37" r="2" />
            <circle cx="63" cy="43" r="1.6" />
            <circle cx="111" cy="29" r="1.8" />
            <circle cx="128" cy="14" r="1.4" />
            <path d="m84 14 1.3 3.7L89 19l-3.7 1.3L84 24l-1.3-3.7L79 19l3.7-1.3Z" />
          </g>
        )}
      </svg>
    </span>
  );
}

/** A small illustrated companion; the card remains the only interactive target. */
export function CheckInCardArtwork({
  period,
  day,
}: {
  period: DailyCheckInPeriod;
  day: string;
}) {
  return <ArtworkScene key={`${day}:${period}`} period={period} />;
}

/** One day’s scene owns its arrival and the later ambient handoff together. */
function ArtworkScene({ period }: { period: DailyCheckInPeriod }) {
  const [ambientReady, setAmbientReady] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const morning = period === "morning";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resetAmbient = () => {
      setAmbientReady(false);
      setEntryReady(false);
    };
    reduced.addEventListener("change", resetAmbient);
    return () => reduced.removeEventListener("change", resetAmbient);
  }, []);

  return (
    <span
      className={styles.stage}
      data-check-in-artwork={period}
      data-artwork-ambient-ready={ambientReady}
      aria-hidden="true"
    >
      <span
        className={styles.entryGate}
        data-check-in-entry-gate
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setEntryReady(true);
        }}
      />
      <span
        className={styles.ambientGate}
        data-check-in-ambient-gate
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setAmbientReady(true);
        }}
      />
      <span className={styles.arrival}>
        <MedicationCardIconFrame
          color={CHECK_IN_CARD_COLOR[period]}
          className={styles.tile}
          style={{
            color: "var(--art-ink)",
            backgroundColor: "var(--check-in-icon-background)",
          }}
          data-check-in-icon-tile
        >
          <span className={styles.symbolArrival}>
            <span className={styles.symbolFloat}>
              {morning ? (
                <MorningCoffee className={styles.coffee} />
              ) : (
                <EveningMoon
                  ambientReady={ambientReady}
                  entryReady={entryReady}
                />
              )}
            </span>
          </span>
        </MedicationCardIconFrame>
      </span>
      {morning && (
        <>
          <CardIconSettle owner="check-in" />
          <svg className={styles.flourish} viewBox="0 0 56 56" fill="none">
            <path d="M47 4v4m-2-2h4" />
            <path d="M5 44v3m-1.5-1.5h3" />
            <circle cx="49" cy="47" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </>
      )}
    </span>
  );
}
