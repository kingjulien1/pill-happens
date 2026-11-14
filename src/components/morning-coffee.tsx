"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import styles from "./morning-coffee.module.css";

const WISPS = [
  {
    path: "M17 28C13 24 19 21 17 17S14 9 18 2",
    tip: [18, 2],
    delay: "-1.1s",
    duration: "8.6s",
    sway: "11.4s",
    color: "var(--color-pink-300, #f9a8d4)",
  },
  {
    path: "M25.5 27C29 23 23 20 25.5 15S28 6 25.5-3",
    tip: [25.5, -3],
    delay: "-4.1s",
    duration: "9.3s",
    sway: "13.2s",
    color: "var(--color-pink-200, #fbcfe8)",
  },
  {
    path: "M34 28C38 24 32 21 34 17S37 9 33 2",
    tip: [33, 2],
    delay: "-6.6s",
    duration: "8.9s",
    sway: "12.1s",
    color: "var(--color-fuchsia-300, #f0abfc)",
  },
] as const;

const SPARK_COLORS = [
  "var(--color-pink-300, #f9a8d4)",
  "var(--color-fuchsia-300, #f0abfc)",
  "var(--color-violet-300, #c4b5fd)",
  "var(--palette-iris, #b7c9f5)",
  "var(--color-pink-200, #fbcfe8)",
  "var(--color-amber-200, #fde68a)",
  "var(--color-cyan-200, #a5f3fc)",
  "var(--color-orange-200, #fed7aa)",
] as const;

/* An airy, upward-biased spray fits above the icon without reaching its copy.
   Fixed vectors avoid timers, random hydration differences and growing DOM. */
const SPARKS = [
  { x: -10, y: -2.8, angle: -164, kind: "dot" },
  { x: -8, y: -10.8, angle: -126, kind: "ray" },
  { x: 0, y: -13.5, angle: -90, kind: "star" },
  { x: 8.4, y: -9.6, angle: -49, kind: "ray" },
  { x: 11, y: -1.5, angle: -8, kind: "dot" },
  { x: 8.8, y: 5.2, angle: 31, kind: "ray" },
  { x: 2.2, y: 8.3, angle: 75, kind: "star" },
  { x: -7.5, y: 7.2, angle: 136, kind: "ray" },
] as const;

/** One bounded firework inherits the exact travel clock from its steam lane. */
function SteamFirework({
  tip,
  lane,
}: {
  tip: readonly [number, number];
  lane: number;
}) {
  return (
    <g className={styles.fireworksReveal} data-coffee-firework-gate>
      <g
        transform={`translate(${tip[0]} ${tip[1]})`}
        data-coffee-firework-anchor={lane}
        data-firework-origin={`${tip[0]},${tip[1]}`}
      >
        <circle
          className={styles.burstGlow}
          r="3.2"
          data-coffee-firework-glow
        />
        <circle
          className={styles.burstRing}
          r="1.8"
          style={{ color: SPARK_COLORS[(lane * 3) % SPARK_COLORS.length] }}
          data-coffee-firework-ring
        />
        <circle
          className={styles.burstCore}
          r="1.25"
          data-coffee-firework-core
        />
        {SPARKS.map((spark, index) => (
          <g
            key={index}
            className={styles.spark}
            data-coffee-spark={spark.kind}
            style={
              {
                "--spark-x": `${spark.x}px`,
                "--spark-y": `${spark.y}px`,
                "--spark-mid-x": `${spark.x * 0.64}px`,
                "--spark-mid-y": `${spark.y * 0.72}px`,
                "--spark-end-x": `${spark.x * 1.08}px`,
                "--spark-end-y": `${spark.y + 2.5}px`,
                "--spark-angle": `${spark.angle}deg`,
                "--spark-turn": `${spark.angle + (spark.kind === "star" ? 105 : 12)}deg`,
                color: SPARK_COLORS[(index + lane * 2) % SPARK_COLORS.length],
              } as CSSProperties
            }
          >
            {spark.kind === "star" ? (
              <path d="M0 -1.4 L.36 -.36 L1.4 0 L.36 .36 L0 1.4 L-.36 .36 L-1.4 0 L-.36 -.36Z" />
            ) : spark.kind === "ray" ? (
              <path
                d="M-2.4 0H0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ) : (
              <circle r="0.8" />
            )}
          </g>
        ))}
      </g>
    </g>
  );
}

/** A still cup, unhurried steam and tiny celebrations at each thread’s tip. */
export function MorningCoffee({
  dialogOpen = false,
  ambientReady = true,
}: {
  dialogOpen?: boolean;
  ambientReady?: boolean;
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
        ambientReady &&
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
  }, [ambientReady, dialogOpen]);

  return (
    <span
      ref={rootRef}
      className={styles.root}
      data-coffee-active="false"
      data-coffee-ambient-ready={ambientReady}
      data-coffee-steam
      aria-hidden="true"
    >
      <svg className={styles.scene} viewBox="0 0 56 56" fill="none">
        <defs>
          <radialGradient
            id={`${id}-steam-glow`}
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="92%"
          >
            <stop
              stopColor="var(--color-pink-300, #f9a8d4)"
              stopOpacity="0.88"
            />
            <stop
              offset=".26"
              stopColor="var(--color-pink-300, #f9a8d4)"
              stopOpacity="0.66"
            />
            <stop
              offset=".64"
              stopColor="var(--color-fuchsia-300, #f0abfc)"
              stopOpacity="0.24"
            />
            <stop
              offset="1"
              stopColor="var(--color-pink-300, #f9a8d4)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id={`${id}-rim-glow`}>
            <stop
              stopColor="var(--color-pink-200, #fbcfe8)"
              stopOpacity="0.95"
            />
            <stop
              offset=".35"
              stopColor="var(--color-pink-300, #f9a8d4)"
              stopOpacity="0.76"
            />
            <stop
              offset=".72"
              stopColor="var(--color-pink-400, #f472b6)"
              stopOpacity="0.24"
            />
            <stop
              offset="1"
              stopColor="var(--color-pink-300, #f9a8d4)"
              stopOpacity="0"
            />
          </radialGradient>
          <clipPath id={`${id}-glow-above-rim`}>
            <rect x="0" y="-12" width="56" height="41" />
          </clipPath>
          <linearGradient
            id={`${id}-steam-reveal-gradient`}
            x1="0"
            y1="-12"
            x2="0"
            y2="29"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask
            id={`${id}-steam-reveal`}
            maskUnits="userSpaceOnUse"
            x="-4"
            y="-12"
            width="64"
            height="48"
          >
            <rect
              className={styles.steamReveal}
              x="-4"
              y="-200"
              width="64"
              height="400"
              fill={`url(#${id}-steam-reveal-gradient)`}
              data-coffee-steam-reveal
            />
          </mask>
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
                <stop stopColor={color} stopOpacity="0.48" />
                <stop offset=".3" stopColor={color} stopOpacity="0.7" />
                <stop offset=".7" stopColor={color} stopOpacity="0.36" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </g>
          ))}
        </defs>
        <g
          className={styles.glow}
          fill={`url(#${id}-steam-glow)`}
          clipPath={`url(#${id}-glow-above-rim)`}
          data-coffee-glow
        >
          <ellipse cx="26" cy="12" rx="13" ry="19" />
          <ellipse
            cx="16"
            cy="18"
            rx="9"
            ry="13"
            opacity="0.3"
            transform="rotate(-16 16 18)"
          />
          <ellipse
            cx="36"
            cy="16"
            rx="9"
            ry="15"
            opacity="0.3"
            transform="rotate(16 36 16)"
          />
          <ellipse
            cx="25.5"
            cy="27.4"
            rx="11.5"
            ry="3.2"
            fill={`url(#${id}-rim-glow)`}
            data-coffee-rim-glow
          />
        </g>
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
              <g mask={`url(#${id}-steam-reveal)`}>
                <use
                  href={`#${id}-steam-${index}`}
                  className={styles.trace}
                  stroke={`url(#${id}-warmth-${index})`}
                />
                <g className={styles.ribbon} data-coffee-traveller>
                  <use href={`#${id}-steam-${index}`} className={styles.halo} />
                  <use
                    href={`#${id}-steam-${index}`}
                    className={styles.thread}
                  />
                  <use
                    href={`#${id}-steam-${index}`}
                    className={styles.highlight}
                  />
                </g>
              </g>
              <SteamFirework tip={wisp.tip} lane={index} />
            </g>
          ))}
        </g>
        <g className={styles.mug} data-coffee-mug>
          <path
            className={styles.mugBody}
            d="M14 29h23v8a7 7 0 0 1-7 7h-9a7 7 0 0 1-7-7v-8Z"
          />
          <path className={styles.mugHandle} d="M37 31h1.5a4 4 0 0 1 0 8H37" />
        </g>
      </svg>
    </span>
  );
}
