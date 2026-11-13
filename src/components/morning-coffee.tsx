"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import styles from "./morning-coffee.module.css";

const WISPS = [
  {
    path: "M19 27C13 22 24 20 20 15S15 7 21 1",
    delay: "-1.1s",
    duration: "8.6s",
    sway: "11.4s",
    color: "var(--color-pink-300, #f9a8d4)",
  },
  {
    path: "M26 26C33 21 20 18 25 12S30 4 25-3",
    delay: "-4.1s",
    duration: "9.3s",
    sway: "13.2s",
    color: "var(--color-pink-200, #fbcfe8)",
  },
  {
    path: "M32 27C38 22 27 20 32 15S36 7 31 2",
    delay: "-6.6s",
    duration: "8.9s",
    sway: "12.1s",
    color: "#f6d7ef",
  },
] as const;

/** An empty cup stays still while three loose threads of warmth gently uncurl. */
export function MorningCoffee({
  dialogOpen = false,
}: {
  dialogOpen?: boolean;
}) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stage = root.closest<HTMLElement>("[data-check-in-artwork]") ?? root;
    const card = root.closest<HTMLElement>(
      "[data-card-entry], [data-card-entry-state]",
    );
    const readiness = root.closest<HTMLElement>("[data-page-entry-ready]");
    const refreshContent = root.closest<HTMLElement>(
      "[data-page-refresh-content]",
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = !("IntersectionObserver" in window);
    let disposed = false;
    let syncFrame: number | null = null;

    function syncActivity() {
      if (disposed) return;
      const active =
        !dialogOpen &&
        !document.hidden &&
        !reducedMotion.matches &&
        visible &&
        card?.dataset.cardEntryState !== "pending" &&
        getComputedStyle(stage).getPropertyValue("--art-play").trim() !==
          "paused";
      root!.dataset.coffeeActive = String(active);
    }

    function queueSync() {
      if (disposed || syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        syncActivity();
      });
    }

    const intersection =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            syncActivity();
          })
        : null;
    intersection?.observe(root);
    const mutations = new MutationObserver(queueSync);
    const watched = new Set(
      [
        document.documentElement,
        document.body,
        stage,
        card,
        readiness,
        refreshContent,
      ].filter((element): element is HTMLElement => element !== null),
    );
    watched.forEach((element) =>
      mutations.observe(element, {
        attributes: true,
        attributeFilter: [
          "class",
          "style",
          "data-card-entry-state",
          "data-page-refresh-active",
          "data-page-entry-ready",
          "data-artwork-dialog-open",
        ],
      }),
    );
    document.addEventListener("visibilitychange", syncActivity);
    reducedMotion.addEventListener("change", syncActivity);
    queueSync();

    return () => {
      disposed = true;
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      intersection?.disconnect();
      mutations.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
      reducedMotion.removeEventListener("change", syncActivity);
    };
  }, [dialogOpen]);

  return (
    <span
      ref={rootRef}
      className={styles.root}
      data-coffee-active="false"
      data-coffee-steam
      aria-hidden="true"
    >
      <svg className={styles.scene} viewBox="0 0 56 56" fill="none">
        <defs>
          {WISPS.map(({ path, color }, index) => (
            <g key={path}>
              <path id={`${id}-steam-${index}`} d={path} pathLength="100" />
              <linearGradient
                id={`${id}-warmth-${index}`}
                x1="26"
                y1="29"
                x2="26"
                y2="-4"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor={color} stopOpacity="0.12" />
                <stop offset=".3" stopColor={color} stopOpacity="0.2" />
                <stop offset=".7" stopColor={color} stopOpacity="0.1" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </g>
          ))}
        </defs>
        <g className={styles.warmth}>
          {WISPS.map((wisp, index) => (
            <g
              key={wisp.path}
              className={styles.sway}
              data-coffee-wisp={index}
              style={
                {
                  "--steam-delay": wisp.delay,
                  "--steam-duration": wisp.duration,
                  "--steam-sway-duration": wisp.sway,
                  "--steam-ink": wisp.color,
                } as CSSProperties
              }
            >
              <use
                href={`#${id}-steam-${index}`}
                className={styles.trace}
                stroke={`url(#${id}-warmth-${index})`}
              />
              <g className={styles.ribbon}>
                <use href={`#${id}-steam-${index}`} className={styles.halo} />
                <use href={`#${id}-steam-${index}`} className={styles.thread} />
                <use
                  href={`#${id}-steam-${index}`}
                  className={styles.highlight}
                />
              </g>
            </g>
          ))}
        </g>
        <path
          className={styles.mug}
          data-coffee-mug
          d="M14 29h23v8a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-8Zm23 2h1.5a4 4 0 0 1 0 8H37"
        />
      </svg>
    </span>
  );
}
