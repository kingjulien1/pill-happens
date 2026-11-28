"use client";

import { useId, useLayoutEffect, useRef, type CSSProperties } from "react";
import { LockKeyhole, RefreshCw } from "lucide-react";
import type { HoldFeedback } from "./use-hold-press";
import styles from "./time-lock-countdown.module.css";

const captions = {
  charging: "Keep holding",
  ready: "Release to lock",
  released: "Locked",
  canceled: "Canceled",
} as const;

export function timeLockCaption(phase: HoldFeedback, pinned: boolean) {
  return phase === "ready" && pinned ? "Release to relock" : captions[phase];
}

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

export function HoldCountdown({
  phase,
  pinned = false,
  medication = false,
  chargeDuration,
  getChargeElapsed,
}: {
  phase: HoldFeedback;
  pinned?: boolean;
  medication?: boolean;
  chargeDuration: number;
  getChargeElapsed?: () => number;
}) {
  const gradientId = useId();
  const Glyph = medication ? RefreshCw : LockKeyhole;
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const dial = ref.current;
    if (!dial || phase !== "charging" || !getChargeElapsed) return;
    let frame = 0;
    // Sample the gesture's clock so a late mount or dropped frame cannot delay the dial.
    const paint = () => {
      const elapsed = Math.min(1, getChargeElapsed() / chargeDuration);
      dial.style.setProperty("--time-lock-elapsed", String(elapsed));
      if (elapsed < 1) frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [phase, chargeDuration, getChargeElapsed]);
  useLayoutEffect(() => {
    const node = ref.current;
    const anchor = node?.parentElement;
    if (!node || !anchor) return;
    const pane = anchor.closest(
      '[data-dialog-scroll], [data-slot="dialog-content"], [data-slot="drawer-popup"]',
    );
    const paneBounds = pane?.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const visibleTop = Math.max(paneBounds?.top ?? 0, viewportTop);
    const visibleBottom = Math.min(
      paneBounds?.bottom ?? Infinity,
      viewportTop + (viewport?.height ?? window.innerHeight),
    );
    const trigger = anchor.getBoundingClientRect();
    const roomAbove = trigger.top - visibleTop;
    const roomBelow = visibleBottom - trigger.bottom;
    // Reserve the caption's 26-degree swing as well as the full-size dial.
    const caption = node.querySelector<HTMLElement>("[data-caption]");
    const reach = caption
      ? Math.max(
          node.offsetWidth / 2 - caption.offsetLeft,
          caption.offsetLeft + caption.offsetWidth - node.offsetWidth / 2,
        )
      : 0;
    const swing = reach * Math.sin((26 * Math.PI) / 180);
    const clearance =
      Math.max(
        0,
        swing + ((caption?.offsetHeight ?? 0) - node.offsetHeight) / 2,
      ) + 8;
    if (roomAbove < clearance - node.offsetTop && roomBelow > roomAbove)
      node.dataset.side = "below";
  }, []);

  return (
    <span
      ref={ref}
      className={styles.countdown}
      data-lock-countdown={phase}
      data-medication-dial={medication || undefined}
      data-pinned={pinned || undefined}
      style={{ "--charge-duration": `${chargeDuration}ms` } as CSSProperties}
      aria-hidden="true"
    >
      {(phase === "charging" || phase === "ready") && (
        <span className={styles.caption} data-caption="hold">
          {captions.charging}
        </span>
      )}
      {phase !== "charging" && (
        <span className={styles.caption} data-caption="result">
          {medication && phase === "ready"
            ? "Release for actions"
            : medication && phase === "released"
              ? "Actions open"
              : timeLockCaption(phase, pinned)}
        </span>
      )}
      <span className={styles.disc}>
        <svg className={styles.ring} viewBox="0 0 52 52" fill="none">
          {medication && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
                <stop stopColor="#e9d4ff" />
                <stop offset=".55" stopColor="#a855f7" />
                <stop offset="1" stopColor="#f0abfc" />
              </linearGradient>
            </defs>
          )}
          <circle className={styles.track} cx="26" cy="26" r="21.5" />
          <circle
            className={styles.arc}
            cx="26"
            cy="26"
            r="21.5"
            pathLength="100"
            stroke={medication ? `url(#${gradientId})` : "currentColor"}
            transform="rotate(-90 26 26)"
          />
        </svg>
        <Glyph className={styles.latch} strokeWidth={2.35} />
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
