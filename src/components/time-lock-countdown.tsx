"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
import { LockKeyhole } from "lucide-react";
import type { TimeLockFeedback } from "./use-time-lock-press";
import styles from "./time-lock-countdown.module.css";

const captions = {
  charging: "Keep holding",
  ready: "Release to lock",
  released: "Locked",
  canceled: "Canceled",
} as const;

// Stagger the short sparks among longer ribbons so the burst opens in two beats.
const confetti = Array.from(
  { length: 15 },
  (_, index) =>
    ({
      "--bearing": `${index * 24 - 8}deg`,
      "--travel": `${-(26 + ((index * 7) % 19))}px`,
      "--twist": `${index % 2 ? 105 : -145}deg`,
      "--delay": `${(index % 3) * 24}ms`,
    }) as CSSProperties,
);

export function TimeLockCountdown({
  phase,
  chargeDuration,
}: {
  phase: TimeLockFeedback;
  chargeDuration: number;
}) {
  const gradientId = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const anchor = node?.parentElement;
    if (!node || !anchor) return;
    const pane = anchor.closest(
      '[data-dialog-scroll], [data-slot="dialog-content"], [data-slot="drawer-popup"]',
    );
    const visibleTop = Math.max(
      pane?.getBoundingClientRect().top ?? 0,
      window.visualViewport?.offsetTop ?? 0,
    );
    // If the control is against the scrollport's top edge, unfold towards the fields.
    if (anchor.getBoundingClientRect().top + node.offsetTop < visibleTop + 6)
      node.dataset.side = "below";
  }, []);

  return (
    <span
      ref={ref}
      className={styles.countdown}
      data-lock-countdown={phase}
      style={{ "--charge-duration": `${chargeDuration}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.caption}>{captions[phase]}</span>
      <span className={styles.disc}>
        <svg className={styles.ring} viewBox="0 0 52 52" fill="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
              <stop stopColor="#c4b5fd" />
              <stop offset=".55" stopColor="#fda4af" />
              <stop offset="1" stopColor="#fde68a" />
            </linearGradient>
          </defs>
          <circle className={styles.track} cx="26" cy="26" r="21.5" />
          <circle
            className={styles.arc}
            cx="26"
            cy="26"
            r="21.5"
            pathLength="100"
            stroke={`url(#${gradientId})`}
            transform="rotate(-90 26 26)"
          />
        </svg>
        <LockKeyhole className={styles.latch} strokeWidth={2.35} />
      </span>
      {phase === "released" && (
        <span className={styles.burst}>
          {confetti.map((style, index) => (
            <i key={index} style={style} />
          ))}
        </span>
      )}
    </span>
  );
}
