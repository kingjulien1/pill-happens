"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getEveningMoonMotion } from "@/lib/evening-moon-motion";
import styles from "./evening-moon.module.css";

const STAR_POSITIONS = [
  { x: -6, y: 2 },
  { x: 15, y: -8 },
  { x: 36, y: 1 },
  { x: 40, y: 17 },
  { x: 34, y: 35 },
  { x: 8, y: 39 },
  { x: -9, y: 25 },
  { x: -10, y: 11 },
] as const;
const STAR_COLORS = [
  ["#f9a8d4", "#fce7f3"],
  ["#c4b5fd", "#f9a8d4"],
  ["#bae6fd", "#e9d5ff"],
  ["#fde68a", "#fff7d6"],
  ["#e9d5ff", "#fbcfe8"],
] as const;
const STAR_PATH = "M0-3.2.85-.85 3.2 0 .85.85 0 3.2-.85.85-3.2 0-.85-.85Z";

type EveningStar = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  duration: number;
  size: number;
  angle: number;
  turn: number;
  colors: (typeof STAR_COLORS)[number];
  bright: boolean;
};

/** A compound hanging arc carries a softly lagging crescent through a quiet sky. */
export function EveningMoon({
  dialogOpen = false,
  ambientReady = true,
}: {
  dialogOpen?: boolean;
  ambientReady?: boolean;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const orbitRef = useRef<HTMLSpanElement>(null);
  const swayRef = useRef<HTMLSpanElement>(null);
  const motion = useRef<Animation[]>([]);
  const nextStarId = useRef(0);
  const [view, setView] = useState({
    active: false,
    stars: [] as EveningStar[],
  });

  // Native timelines survive activity-gate changes; only unmount cancels them.
  useEffect(() => {
    const orbit = orbitRef.current;
    const sway = swayRef.current;
    if (!orbit?.animate || !sway?.animate) return;
    const model = getEveningMoonMotion();
    const options: KeyframeAnimationOptions = {
      duration: model.duration,
      iterations: Infinity,
      easing: "linear",
      fill: "both",
    };
    const animations = [
      orbit.animate(
        model.frames.map(({ offset, x, y }) => ({
          offset,
          transform: `translate(${x}px, ${y}px)`,
        })),
        options,
      ),
      sway.animate(
        model.frames.map(({ offset, rotation, scale }) => ({
          offset,
          transform: `rotate(${rotation}deg) scale(${scale})`,
        })),
        options,
      ),
    ];
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 0;
    }
    motion.current = animations;
    return () => {
      motion.current = [];
      for (const animation of animations) animation.cancel();
    };
  }, []);

  useEffect(() => {
    for (const animation of motion.current)
      if (view.active) animation.play();
      else animation.pause();
  }, [view.active]);

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
    const timers = new Set<number>();
    const live = new Map<number, EveningStar>();
    let visible = !("IntersectionObserver" in window);
    let active: boolean | null = null;
    let disposed = false;
    let syncFrame: number | null = null;
    let lastSlot = -1;

    function later(callback: () => void, delay: number) {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
    }

    function clearStars() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      live.clear();
    }

    function spawnStar() {
      if (!active || live.size >= 2) return;
      const slots = STAR_POSITIONS.map((_, index) => index).filter((index) => {
        if (index === lastSlot) return false;
        const point = STAR_POSITIONS[index];
        return !Array.from(live.values()).some(
          (star) => Math.hypot(star.x - point.x, star.y - point.y) < 18,
        );
      });
      if (!slots.length) return;
      const slot = slots[Math.floor(Math.random() * slots.length)];
      const point = STAR_POSITIONS[slot];
      const star: EveningStar = {
        id: nextStarId.current++,
        x: point.x + (Math.random() - 0.5) * 1.4,
        y: point.y + (Math.random() - 0.5) * 1.4,
        dx: (Math.random() - 0.5) * 2.4,
        dy: -0.8 - Math.random() * 1.8,
        duration: 1250 + Math.random() * 1450,
        size: 7 + Math.random() * 2.4,
        angle: (Math.random() - 0.5) * 24,
        turn: (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 16),
        colors: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        bright: nextStarId.current % 5 !== 0,
      };
      lastSlot = slot;
      live.set(star.id, star);
      setView((current) => ({ ...current, stars: [...current.stars, star] }));
      later(() => {
        live.delete(star.id);
        setView((current) => ({
          ...current,
          stars: current.stars.filter((item) => item.id !== star.id),
        }));
      }, star.duration);
    }

    function queueStar(first = false) {
      later(
        () => {
          if (!active) return;
          spawnStar();
          queueStar();
        },
        first ? 900 + Math.random() * 700 : 1500 + Math.random() * 1300,
      );
    }

    function syncActivity() {
      if (disposed) return;
      const nextActive =
        ambientReady &&
        !dialogOpen &&
        !document.hidden &&
        !reducedMotion.matches &&
        visible &&
        card?.dataset.cardEntryState !== "pending" &&
        getComputedStyle(stage).getPropertyValue("--art-play").trim() !==
          "paused";
      if (nextActive === active) return;
      active = nextActive;
      clearStars();
      setView({ active: nextActive, stars: [] });
      if (nextActive) queueStar(true);
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
      clearStars();
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
      data-evening-moon
      data-lunar-active={view.active}
      data-lunar-ambient-ready={ambientReady}
      data-lunar-star-count={view.stars.length}
      aria-hidden="true"
    >
      <span ref={orbitRef} className={styles.orbit} data-lunar-orbit>
        <span ref={swayRef} className={styles.sway} data-lunar-sway>
          <svg
            className={styles.moon}
            viewBox="0 0 24 24"
            data-evening-crescent
          >
            <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401Z" />
          </svg>
        </span>
      </span>
      <span className={styles.sky}>
        {view.stars.map((star) => (
          <span
            key={star.id}
            className={styles.star}
            data-lunar-star={star.id}
            data-bright={star.bright}
            data-lifetime={Math.round(star.duration)}
            style={
              {
                left: `${star.x}px`,
                top: `${star.y}px`,
                "--star-duration": `${star.duration}ms`,
                "--star-size": `${star.size}px`,
                "--star-dx": `${star.dx}px`,
                "--star-dy": `${star.dy}px`,
                "--star-angle": `${star.angle}deg`,
                "--star-turn": `${star.turn}deg`,
                "--star-from": star.colors[0],
                "--star-to": star.colors[1],
              } as CSSProperties
            }
          >
            <svg
              className={styles.starGlyph}
              viewBox="-4 -4 8 8"
              fill="currentColor"
            >
              <circle className={styles.aureole} r="3.2" />
              <path className={styles.starCore} d={STAR_PATH} />
              <path
                className={styles.rays}
                d="M0-5v-2M0 5v2M-5 0h-2M5 0h2M3.6-3.6l1.1-1.1M-3.6 3.6l-1.1 1.1M3.6 3.6l1.1 1.1M-3.6-3.6l-1.1-1.1"
              />
              <circle className={styles.burstRing} r="2.7" />
              <path
                className={styles.burstSpecks}
                d="M0-5.8v-.7M4.1-4.1l.5-.5M5.8 0h.7M4.1 4.1l.5.5M0 5.8v.7M-4.1 4.1l-.5.5M-5.8 0h-.7M-4.1-4.1l-.5-.5"
              />
            </svg>
          </span>
        ))}
      </span>
      <svg
        className={styles.stillStars}
        viewBox="0 0 30 30"
        fill="currentColor"
      >
        <path d="m23 3 .5 1.5L25 5l-1.5.5L23 7l-.5-1.5L21 5l1.5-.5Z" />
        <path d="m29 20 .4 1.1 1.1.4-1.1.4L29 23l-.4-1.1-1.1-.4 1.1-.4Z" />
      </svg>
    </span>
  );
}
