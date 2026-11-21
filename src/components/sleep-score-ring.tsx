"use client";

import { type CSSProperties } from "react";
import { useSleepScoreMotion } from "./use-sleep-score-motion";
import styles from "./sleep-score-ring.module.css";

const ARC = "M55.653283 184.346717 A91 91 0 1 1 184.346717 184.346717";
/** Score edits stay native; the visible dial owns one bounded decorative layer. */
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
  const dial = useSleepScoreMotion(positive && !disabled);
  return (
    <div
      ref={dial}
      className={styles.dial}
      data-sleep-score-ring
      data-active="false"
      data-score-known={score !== null}
      data-score-positive={positive}
      data-score={score ?? undefined}
      style={{ "--score-offset": 100 - (score ?? 0) } as CSSProperties}
    >
      <span className={styles.aura} aria-hidden="true" />
      <svg className={styles.scene} viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <filter
            id={`${id}-score-bloom`}
            x="-45%"
            y="-45%"
            width="190%"
            height="190%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter
            id={`${id}-score-corona`}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
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
              className={`${styles.progress} ${styles.bloom}`}
              d={ARC}
              pathLength="100"
              stroke={`url(#${id}-score-pigment)`}
              filter={`url(#${id}-score-bloom)`}
            />
            <path
              className={`${styles.progress} ${styles.glow}`}
              d={ARC}
              pathLength="100"
              stroke={`url(#${id}-score-pigment)`}
              filter={`url(#${id}-score-corona)`}
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
