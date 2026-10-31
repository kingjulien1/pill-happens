"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ActionIcon } from "@/components/action-icon";
import styles from "./streak-artwork.module.css";

export type StreakPalette = { accent: string; pop: string; spark: string };

/** Shared celebratory scenery; the caller owns the readable foreground. */
export function StreakArtwork({
  seed,
  palette,
  party = false,
}: {
  seed: number;
  palette: StreakPalette;
  party?: boolean;
}) {
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      node.dataset.active = String(
        visible && !document.hidden && !reduced.matches,
      );
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    if (observer) observer.observe(node);
    else {
      visible = true;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      node.dataset.active = "false";
    };
  }, []);

  return (
    <span
      ref={element}
      className={styles.artwork}
      data-streak-artwork
      data-active="false"
      data-party={party}
      aria-hidden="true"
      style={
        {
          "--streak-art-a": palette.accent,
          "--streak-art-b": palette.pop,
          "--streak-art-c": palette.spark,
          "--streak-art-phase": `${-(seed % 13)}s`,
        } as CSSProperties
      }
    >
      <span className={styles.glow} data-streak-glow />
      <span className={styles.pattern} />
      <span className={styles.orbit} />
      <span className={styles.orbitSecond} />
      <svg
        className={styles.waves}
        viewBox="0 0 360 220"
        fill="none"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path d="M-35 145C22 25 63 22 126 111S235 215 395 56" />
        <path d="M-35 85C35 191 91 192 159 102S273 23 395 153" />
      </svg>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={styles.star}
          style={
            {
              "--star-x": `${[10, 79, 87][index]}%`,
              "--star-y": `${[23, 12, 75][index]}%`,
              "--star-size": `${[18, 25, 12][index]}px`,
              "--star-phase": `${-((seed + index * 3) % 7)}s`,
            } as CSSProperties
          }
        >
          <ActionIcon
            name={index === 1 ? "sparkle" : "shootingStar"}
            weight="fill"
            className="size-full"
          />
        </span>
      ))}
      {Array.from({ length: party ? 16 : 8 }, (_, index) => {
        const value = ((seed + 1) * 1664525 + index * 1013904223) >>> 0;
        return (
          <span
            key={index}
            className={styles.confetti}
            style={
              {
                "--piece-x": `${6 + (value % 88)}%`,
                "--piece-y": `${8 + ((value >>> 8) % 82)}%`,
                "--piece-angle": `${(value % 160) - 80}deg`,
                "--piece-drift": `${((value >>> 12) % 37) - 18}px`,
                "--piece-phase": `${-((value % 10000) / 1000)}s`,
                "--piece-color": [
                  palette.accent,
                  palette.pop,
                  palette.spark,
                  "#ffdf20",
                ][index % 4],
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
