"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./evening-moon.module.css";

type LunarMode = "moon" | "sun-moon";

const TRANSITION_MS = 920;
const SPARKLES = [
  { fromX: -2, fromY: -1, toX: -16, toY: -14, color: "#fff5df" },
  { fromX: 2, fromY: -2, toX: 16, toY: -17, color: "#ffd2a8" },
  { fromX: 1, fromY: 2, toX: 18, toY: 12, color: "#bce8f5" },
  { fromX: -2, fromY: 2, toX: -14, toY: 17, color: "#d6d0ff" },
];

/** One crescent stays mounted while the sun quietly joins and leaves it. */
export function EveningMoon({ dialogOpen = false }: { dialogOpen?: boolean }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<LunarMode>("moon");
  const finishTransitionRef = useRef<(() => void) | null>(null);
  const [view, setView] = useState({
    mode: "moon" as LunarMode,
    active: false,
    transitioning: false,
    bursting: false,
    burst: 0,
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stage = root.closest<HTMLElement>("[data-check-in-artwork]") ?? root;
    const card = root.closest<HTMLElement>(
      "[data-card-entry], [data-card-entry-state]",
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<number>();
    let visible = !("IntersectionObserver" in window);
    let active: boolean | null = null;
    let disposed = false;
    let inTransition = false;
    let syncFrame: number | null = null;
    let fallbackTimer: number | null = null;
    let midpointTimer: number | null = null;
    let burstEndTimer: number | null = null;

    function later(callback: () => void, delay: number) {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
      return timer;
    }

    function cancel(timer: number | null) {
      if (timer === null) return;
      window.clearTimeout(timer);
      timers.delete(timer);
    }

    function clearTimers() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      fallbackTimer = midpointTimer = burstEndTimer = null;
    }

    function emitSparkles() {
      if (!active) return;
      cancel(burstEndTimer);
      setView((current) => ({
        ...current,
        bursting: true,
        burst: current.burst + 1,
      }));
      burstEndTimer = later(() => {
        setView((current) => ({ ...current, bursting: false }));
      }, 1580);
    }

    function queueSparkles() {
      later(
        () => {
          if (!active) return;
          if (!inTransition) emitSparkles();
          queueSparkles();
        },
        2500 + Math.random() * 2000,
      );
    }

    function queueTransition() {
      later(
        () => {
          if (!active) return;
          inTransition = true;
          cancel(burstEndTimer);
          burstEndTimer = null;
          modeRef.current = modeRef.current === "moon" ? "sun-moon" : "moon";
          setView((current) => ({
            ...current,
            mode: modeRef.current,
            transitioning: true,
            bursting: false,
          }));
          midpointTimer = later(emitSparkles, 350);
          fallbackTimer = later(finishTransition, TRANSITION_MS + 160);
        },
        5000 + Math.random() * 5000,
      );
    }

    function finishTransition() {
      if (!active || !inTransition) return;
      inTransition = false;
      cancel(fallbackTimer);
      cancel(midpointTimer);
      fallbackTimer = midpointTimer = null;
      setView((current) => ({ ...current, transitioning: false }));
      queueTransition();
    }

    function syncActivity() {
      if (disposed) return;
      const nextActive =
        !dialogOpen &&
        !document.hidden &&
        !reducedMotion.matches &&
        visible &&
        card?.dataset.cardEntryState !== "pending" &&
        getComputedStyle(stage).getPropertyValue("--art-play").trim() !==
          "paused";

      if (nextActive === active) return;
      active = nextActive;
      clearTimers();
      inTransition = false;
      setView((current) => ({
        ...current,
        active: nextActive,
        transitioning: false,
        bursting: false,
      }));

      if (nextActive) {
        queueTransition();
        queueSparkles();
      }
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
      [document.documentElement, document.body, stage, card].filter(
        (element): element is HTMLElement => element !== null,
      ),
    );
    watched.forEach((element) =>
      mutations.observe(element, {
        attributes: true,
        attributeFilter: [
          "class",
          "style",
          "data-card-entry-state",
          "data-page-refresh-active",
          "data-artwork-dialog-open",
        ],
      }),
    );

    finishTransitionRef.current = finishTransition;
    document.addEventListener("visibilitychange", syncActivity);
    reducedMotion.addEventListener("change", syncActivity);
    queueSync();

    return () => {
      disposed = true;
      clearTimers();
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      intersection?.disconnect();
      mutations.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
      reducedMotion.removeEventListener("change", syncActivity);
      if (finishTransitionRef.current === finishTransition) {
        finishTransitionRef.current = null;
      }
    };
  }, [dialogOpen]);

  return (
    <span
      ref={rootRef}
      className={styles.root}
      data-lunar-mode={view.mode}
      data-lunar-active={view.active}
      data-lunar-transitioning={view.transitioning}
      data-lunar-bursting={view.bursting}
      aria-hidden="true"
    >
      <span className={styles.sway}>
        <span
          className={styles.turn}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              finishTransitionRef.current?.();
            }
          }}
        >
          <svg
            className={styles.glyph}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g className={styles.crescent}>
              <path
                d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <g className={styles.sunlight}>
              <path className={styles.sunArc} d="M16 12a4 4 0 0 0-4-4" />
              <path className={styles.sunRay} d="M12 2v2" />
              <path className={styles.sunRay} d="m19 5-1.256 1.256" />
              <path className={styles.sunRay} d="M20 12h2" />
            </g>
          </svg>
        </span>
      </span>
      <svg
        key={view.burst}
        className={styles.sparkles}
        viewBox="-24 -24 48 48"
        fill="currentColor"
      >
        {SPARKLES.map((sparkle, index) => (
          <path
            key={index}
            className={styles.sparkle}
            d="M0-1.8.45-.45 1.8 0 .45.45 0 1.8-.45.45-1.8 0-.45-.45Z"
            style={
              {
                "--spark-from-x": `${sparkle.fromX}px`,
                "--spark-from-y": `${sparkle.fromY}px`,
                "--spark-to-x": `${sparkle.toX}px`,
                "--spark-to-y": `${sparkle.toY}px`,
                "--spark-delay": `${index * 140}ms`,
                color: sparkle.color,
              } as CSSProperties
            }
          />
        ))}
      </svg>
    </span>
  );
}
