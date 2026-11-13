"use client";

import { createElement, useEffect, useId, useRef } from "react";
import {
  COFFEE_POT_CAVITY_PATH,
  COFFEE_POT_NODES,
} from "@/lib/coffee-pot-icon";
import {
  COFFEE_TIMING,
  getCoffeeSceneActiveDuration,
  getCoffeeSceneFrame,
  type CoffeeSceneOptions,
} from "@/lib/morning-coffee-motion";
import styles from "./morning-coffee.module.css";

const SCENE: CoffeeSceneOptions = {
  mugTarget: { x: 25, y: 29 },
  streamTarget: { x: 25, y: 33 },
  potScale: 1.15,
};
const ACTIVE_MS = getCoffeeSceneActiveDuration();
const REST = getCoffeeSceneFrame(ACTIVE_MS + 1, SCENE);
const MUG_CAVITY = "M13 31h24v4a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5Z";

/** A short refill, with a real level surface inside the moving carafe. */
export function MorningCoffee({
  dialogOpen = false,
}: {
  dialogOpen?: boolean;
}) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const potRef = useRef<SVGGElement>(null);
  const liquidRef = useRef<SVGPathElement>(null);
  const mugLiquidRef = useRef<SVGRectElement>(null);
  const streamRef = useRef<SVGPathElement>(null);
  const steamRef = useRef<SVGGElement>(null);

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
    let active: boolean | null = null;
    let disposed = false;
    let dwellTimer: number | null = null;
    let sceneFrame: number | null = null;
    let syncFrame: number | null = null;

    function paint(frame: ReturnType<typeof getCoffeeSceneFrame>) {
      root!.dataset.coffeePhase = frame.phase;
      root!.dataset.coffeeFill = frame.fillFraction.toFixed(4);
      const pot = potRef.current;
      pot?.setAttribute("transform", frame.pot.transform);
      pot?.setAttribute("opacity", String(frame.pot.opacity));
      pot?.setAttribute("visibility", frame.pot.visible ? "visible" : "hidden");
      liquidRef.current?.setAttribute("d", frame.fluidPath);
      const fillHeight = 9 * frame.mugFill;
      mugLiquidRef.current?.setAttribute("y", String(40 - fillHeight));
      mugLiquidRef.current?.setAttribute("height", String(fillHeight));
      const { start, end, progress, opacity } = frame.stream;
      streamRef.current?.setAttribute(
        "d",
        `M${start.x} ${start.y}Q${start.x - 0.6} ${start.y + 2} ${end.x} ${end.y}`,
      );
      streamRef.current?.setAttribute("opacity", String(opacity));
      streamRef.current?.setAttribute(
        "stroke-width",
        String(0.9 + progress * 0.65),
      );
      steamRef.current?.setAttribute("opacity", String(frame.steamOpacity));
    }

    function cancelCycle() {
      if (dwellTimer !== null) window.clearTimeout(dwellTimer);
      if (sceneFrame !== null) window.cancelAnimationFrame(sceneFrame);
      dwellTimer = sceneFrame = null;
    }

    function queueRefill() {
      if (!active || disposed) return;
      const wait =
        COFFEE_TIMING.minDwellMs +
        Math.random() * (COFFEE_TIMING.maxDwellMs - COFFEE_TIMING.minDwellMs);
      dwellTimer = window.setTimeout(() => {
        dwellTimer = null;
        if (!active || disposed) return;
        // Leave the viewport before hiding; the final fifth-size pot never pops.
        const options = {
          ...SCENE,
          exitTarget: { x: -root!.getBoundingClientRect().left - 32, y: -28 },
        };
        const startedAt = performance.now();
        function tick(now: number) {
          sceneFrame = null;
          if (!active || disposed) return;
          const elapsed = Math.min(now - startedAt, ACTIVE_MS);
          root!.dataset.coffeeElapsed = elapsed.toFixed(0);
          paint(getCoffeeSceneFrame(elapsed, options));
          if (elapsed < ACTIVE_MS) {
            sceneFrame = window.requestAnimationFrame(tick);
          } else {
            paint(REST);
            queueRefill();
          }
        }
        sceneFrame = window.requestAnimationFrame(tick);
      }, wait);
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
      root!.dataset.coffeeActive = String(nextActive);
      cancelCycle();
      paint(REST);
      if (nextActive) queueRefill();
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
      cancelCycle();
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
      data-coffee-phase="dwell"
      data-coffee-active="false"
      aria-hidden="true"
    >
      <svg className={styles.scene} viewBox="0 0 56 56" fill="none">
        <defs>
          <clipPath id={`${id}-pot`}>
            <path d={COFFEE_POT_CAVITY_PATH} />
          </clipPath>
          <clipPath id={`${id}-mug`}>
            <path d={MUG_CAVITY} />
          </clipPath>
          <clipPath id={`${id}-steam`}>
            <path d="M5 4h43v24H5Z" />
          </clipPath>
        </defs>
        <g ref={steamRef} opacity="0.75" clipPath={`url(#${id}-steam)`}>
          {[18, 25, 32].map((x, index) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <path
                className={styles.steam}
                style={{ animationDelay: `${index * -1.1}s` }}
                d="M0 28c-4-3 4-4 0-8"
              />
            </g>
          ))}
        </g>
        <g clipPath={`url(#${id}-mug)`}>
          <rect
            ref={mugLiquidRef}
            x="13"
            y="31"
            width="24"
            height="9"
            className={styles.liquid}
          />
        </g>
        <path
          className={styles.mug}
          d="M11 29h28v6a7 7 0 0 1-7 7H18a7 7 0 0 1-7-7v-6Zm28 1h2a4.5 4.5 0 0 1 0 9h-3"
        />
        <path
          ref={streamRef}
          className={styles.stream}
          d="M25 29v4"
          opacity="0"
        />
        <g
          ref={potRef}
          transform={REST.pot.transform}
          opacity={REST.pot.opacity}
          visibility="hidden"
          className={styles.pot}
        >
          <g clipPath={`url(#${id}-pot)`}>
            <path
              ref={liquidRef}
              d={REST.fluidPath}
              className={styles.liquid}
            />
          </g>
          {COFFEE_POT_NODES.map(([tag, attributes]) =>
            createElement(tag, attributes),
          )}
        </g>
      </svg>
    </span>
  );
}
