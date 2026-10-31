"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { APP_COLORS, withAppAlpha, type AppThemeHex } from "@/lib/app-theme";
import type { StreakPalette } from "@/lib/streak-milestones";
import {
  hasPlayedStreakSpotlight,
  markStreakSpotlightPlayed,
  STREAK_SPOTLIGHT_EVENT,
} from "@/lib/streak-spotlight-client";
import styles from "./streak-spotlight.module.css";

const alpha = (color: string, opacity: number) =>
  withAppAlpha(
    /^#[\da-f]{6}$/i.test(color) ? (color as AppThemeHex) : APP_COLORS.violet,
    opacity,
  );

/** A bounded, one-time arrival around one actual milestone card. */
export function StreakSpotlight({
  target,
  palette,
  children,
}: {
  target: number;
  palette: StreakPalette;
  children: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLSpanElement>(null);
  const announcement = useRef<HTMLSpanElement>(null);
  const { accent, pop, spark } = palette;

  useEffect(() => {
    const node = element.current;
    const layer = burst.current;
    const status = announcement.current;
    if (!node || !layer || !status) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let played = hasPlayedStreakSpotlight(target);
    let disposed = false;
    let phase: "idle" | "waiting" | "running" | "settled" = "idle";
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cancelPending = () => {
      observer?.disconnect();
      observer = null;
      cancelAnimationFrame(frame);
      frame = 0;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const finish = () => {
      cancelPending();
      node.dataset.spotlightState = "settled";
      layer.replaceChildren();
      status.textContent = "";
      if (phase === "running") markStreakSpotlightPlayed(target);
      phase = "settled";
    };
    const addParticles = () => {
      const bounds = node.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const colors = [accent, pop, spark, "#facc15"];
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < 36; index++) {
        const seed = ((target + 1) * 1664525 + index * 1013904223) >>> 0;
        const angle = (((index * 360) / 36 + (seed % 13) - 6) * Math.PI) / 180;
        // Emit around the whole card, then travel outward within the viewport.
        const startX = Math.cos(angle) * bounds.width * 0.42;
        const startY = Math.sin(angle) * bounds.height * 0.34;
        const distance = 64 + (seed % 83);
        const x = Math.max(
          12 - centerX,
          Math.min(
            window.innerWidth - 12 - centerX,
            startX + Math.cos(angle) * distance,
          ),
        );
        const y = Math.max(
          12 - centerY,
          Math.min(
            window.innerHeight - 36 - centerY,
            startY + Math.sin(angle) * distance,
          ),
        );
        const piece = document.createElement("span");
        piece.className = styles.particle;
        piece.dataset.kind =
          index % 6 === 0 ? "star" : index % 3 === 0 ? "dot" : "ribbon";
        piece.style.setProperty("--particle-start-x", `${startX.toFixed(2)}px`);
        piece.style.setProperty("--particle-start-y", `${startY.toFixed(2)}px`);
        piece.style.setProperty("--particle-x", `${x.toFixed(2)}px`);
        piece.style.setProperty("--particle-y", `${y.toFixed(2)}px`);
        piece.style.setProperty("--particle-turn", `${(seed % 360) - 180}deg`);
        piece.style.setProperty(
          "--particle-spin",
          `${((seed >>> 8) % 400) - 200}deg`,
        );
        piece.style.setProperty(
          "--particle-color",
          colors[index % colors.length],
        );
        piece.style.setProperty(
          "--particle-wait",
          `${80 + (index % 5) * 34}ms`,
        );
        piece.style.setProperty(
          "--particle-time",
          `${1450 + (index % 7) * 90}ms`,
        );
        fragment.append(piece);
      }
      layer.replaceChildren(fragment);
    };
    const launch = () => {
      timer = null;
      if (disposed || document.hidden) return;
      played = true;
      phase = "running";
      markStreakSpotlightPlayed(target);
      node
        .querySelector<HTMLAnchorElement>("[data-streak-card]")
        ?.focus({ preventScroll: true });
      status.textContent = `Spotlight on the ${target}-day milestone.`;
      if (motion.matches) node.dataset.spotlightState = "quiet";
      else {
        addParticles();
        node.dataset.spotlightState = "running";
      }
      timer = setTimeout(finish, motion.matches ? 1800 : 2800);
    };
    const schedule = () => {
      observer?.disconnect();
      observer = null;
      if (timer !== null || frame) return;
      // Give navigation, popover dismissal and scrolling room to settle first.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = 0;
          timer = setTimeout(launch, motion.matches ? 0 : 180);
        });
      });
    };
    const reveal = (force = false) => {
      cancelPending();
      layer.replaceChildren();
      status.textContent = "";
      if (played && !force) {
        phase = "settled";
        node.dataset.spotlightState = "settled";
        node.scrollIntoView({ block: "nearest", behavior: "auto" });
        return;
      }
      if (force) played = false;
      phase = "waiting";
      node.dataset.spotlightState = "waiting";
      if (document.hidden) return;
      node.scrollIntoView({
        block: "center",
        behavior: motion.matches ? "auto" : "smooth",
      });
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.7)
              schedule();
          },
          { threshold: [0.7] },
        );
        observer.observe(node);
      } else
        timer = setTimeout(() => {
          timer = null;
          schedule();
        }, 450);
      const bounds = node.getBoundingClientRect();
      if (bounds.top >= 12 && bounds.bottom <= window.innerHeight - 12)
        schedule();
    };
    const onRequest = (event: Event) => {
      if ((event as CustomEvent<unknown>).detail === target) reveal(true);
    };
    const onVisibility = () => {
      if (document.hidden && phase === "running") finish();
      else if (!document.hidden && phase === "waiting") reveal();
    };
    const onMotion = () => {
      if (!motion.matches || phase !== "running") return;
      cancelPending();
      layer.replaceChildren();
      node.dataset.spotlightState = "quiet";
      timer = setTimeout(finish, 1200);
    };
    window.addEventListener(STREAK_SPOTLIGHT_EVENT, onRequest);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);
    reveal();
    return () => {
      disposed = true;
      cancelPending();
      layer.replaceChildren();
      window.removeEventListener(STREAK_SPOTLIGHT_EVENT, onRequest);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
    };
  }, [target, accent, pop, spark]);

  return (
    <div
      ref={element}
      className={styles.spotlight}
      data-streak-spotlight={target}
      data-spotlight-state="idle"
      style={
        {
          "--spotlight-soft-a": alpha(accent, 0.42),
          "--spotlight-soft-b": alpha(pop, 0.34),
          "--spotlight-edge": alpha(spark, 0.9),
        } as CSSProperties
      }
    >
      {children}
      <span
        ref={burst}
        className={styles.burst}
        aria-hidden="true"
        data-streak-burst
      />
      <span ref={announcement} className="sr-only" role="status" />
    </div>
  );
}
