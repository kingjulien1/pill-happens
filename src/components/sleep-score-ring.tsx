"use client";

import { type CSSProperties } from "react";
import styles from "./sleep-score-ring.module.css";

const ARC = "M55.653283 184.346717 A91 91 0 1 1 184.346717 184.346717";
/** A static SVG score: edits update the arc without decorative render clocks. */
export function SleepScoreRing({
  id,
  score,
  rawScore,
  disabled,
  onScoreChange,
}: {
  id: string;
  score: number | null;
  rawScore: string;
  disabled: boolean;
  onScoreChange: (value: string) => void;
}) {
  const positive = score !== null && score > 0;
  return (
    <div
      className={styles.dial}
      data-sleep-score-ring
      data-active="false"
      data-score-known={score !== null}
      data-score-positive={positive}
      style={{ "--score-offset": 100 - (score ?? 0) } as CSSProperties}
    >
      <span className={styles.aura} aria-hidden="true" />
      <svg className={styles.scene} viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <linearGradient
            id={`${id}-score-pigment`}
            x1="15"
            y1="195"
            x2="211"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--score-pink)" />
            <stop offset=".4" stopColor="var(--score-orchid)" />
            <stop offset=".74" stopColor="var(--score-violet)" />
            <stop offset="1" stopColor="var(--score-iris)" />
          </linearGradient>
          <mask
            id={`${id}-score-window`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="240"
            height="240"
          >
            <path className={styles.maskStroke} d={ARC} pathLength="100" />
          </mask>
        </defs>
        <circle className={styles.innerOrbit} cx="120" cy="120" r="75" />
        <path
          className={styles.outerOrbit}
          d="M44.3 195.7a107 107 0 1 1 151.4 0"
        />
        <g className={styles.ticks}>
          {Array.from({ length: 13 }, (_, index) => (
            <path
              key={index}
              d="M120 12v3"
              transform={`rotate(${225 + index * 22.5} 120 120)`}
            />
          ))}
        </g>
        <path className={styles.track} d={ARC} />
        <g className={styles.filled}>
          <g className={styles.arcGlow}>
            <path
              className={`${styles.progress} ${styles.glow}`}
              d={ARC}
              pathLength="100"
              stroke={`url(#${id}-score-pigment)`}
            />
          </g>
          <path
            className={`${styles.progress} ${styles.arc}`}
            d={ARC}
            pathLength="100"
            stroke={`url(#${id}-score-pigment)`}
          />
          <g mask={`url(#${id}-score-window)`}>
            <g className={styles.beam}>
              <circle
                className={styles.shine}
                cx="120"
                cy="120"
                r="91"
                pathLength="100"
              />
              <circle
                className={styles.shineTail}
                cx="120"
                cy="120"
                r="91"
                pathLength="100"
              />
            </g>
          </g>
        </g>
      </svg>
      <div className={styles.copy}>
        <label htmlFor={`${id}-score`}>Sleep Score</label>
        <div className={styles.number}>
          <input
            id={`${id}-score`}
            aria-label="Sleep score out of 100"
            aria-describedby={`${id}-score-hint`}
            aria-invalid={
              (rawScore.trim() !== "" && score === null) || undefined
            }
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            placeholder="—"
            value={rawScore}
            disabled={disabled}
            onChange={(event) => onScoreChange(event.target.value)}
          />
          <span aria-hidden="true">%</span>
        </div>
        <span id={`${id}-score-hint`} className={styles.caption}>
          {rawScore.trim() !== "" && score === null
            ? "Use a whole number from 0 to 100"
            : score === null
              ? "Add a score or import your report"
              : "Tap the number to edit"}
        </span>
      </div>
      <span className={styles.foot} aria-hidden="true">
        Out Of 100
      </span>
    </div>
  );
}
