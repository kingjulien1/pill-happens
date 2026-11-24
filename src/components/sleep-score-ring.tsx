"use client";

import type { AnimationEvent, CSSProperties } from "react";
import { lunarSparkPath, lunarStarPath } from "./lunar-star-paths";
import { useSleepScoreMotion } from "./use-sleep-score-motion";
import styles from "./sleep-score-ring.module.css";

const ARC = "M55.653283 184.346717 A91 91 0 1 1 184.346717 184.346717";
function RingStar({ score }: { score: number }) {
  // Reuse one glyph. Choose its next origin on the filled arc while it is invisible.
  function placeStar(event: AnimationEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    const { style } = event.currentTarget;
    const angle = ((135 + 270 * (score / 100) * Math.random()) * Math.PI) / 180;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const radius = (91 / 240) * 100;
    const distance = 18 + Math.random() * 10;
    const turn = (18 + Math.random() * 200) * (Math.random() < 0.5 ? -1 : 1);
    style.left = `${50 + x * radius}%`;
    style.top = `${50 + y * radius}%`;
    style.width = `${(7 + Math.random() * 2.4) * 0.44}px`;
    style.setProperty("--drift-x", `${x * distance}px`);
    style.setProperty("--drift-y", `${y * distance}px`);
    style.setProperty("--turn", `${turn}deg`);
    style.setProperty(
      "--starlight",
      Math.random() < 0.04 ? "#fde68a" : "#fef3c7",
    );
  }
  return (
    <svg
      className={styles.star}
      viewBox="-4 -4 8 8"
      aria-hidden="true"
      onAnimationStart={placeStar}
      onAnimationIteration={placeStar}
    >
      <path d={lunarStarPath} fill="currentColor" />
      <g className={styles.farewell}>
        <circle r="2.7" strokeWidth=".55" />
        <path d={lunarSparkPath} strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function SleepScoreRing({
  id,
  score,
  disabled,
}: {
  id: string;
  score: number | null;
  disabled: boolean;
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
      {positive && <RingStar key={score} score={score} />}
      <div className={styles.copy}>
        <span className={styles.scoreLabel}>Sleep Score</span>
        <div className={styles.number}>
          <strong>{score ?? "—"}</strong>
          {score !== null && <span>%</span>}
        </div>
        <span className={styles.caption}>
          {score === null
            ? "Awaiting a report score"
            : "From your sleep report"}
        </span>
      </div>
      <span className={styles.foot} aria-hidden="true">
        Out Of 100
      </span>
    </div>
  );
}
