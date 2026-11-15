"use client";

import { useEffect, useRef } from "react";
import { PillBottle } from "lucide-react";
import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";
import styles from "./medication-heading-bottle.module.css";

const SHAKE_DURATION = 920;
const nextShakeInterval = () => 3_000 + Math.random() * 3_000;

/** Decorative motion has its own clock and never reserves a timeline entry slot. */
export function MedicationHeadingBottle({
  paused = false,
}: {
  paused?: boolean;
}) {
  const stageRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const rockRef = useRef<HTMLSpanElement>(null);
  const enteredRef = useRef(false);
  const settledRef = useRef(false);
  const firstShakeRef = useRef(true);

  useEffect(() => {
    const stage = stageRef.current;
    const glyph = glyphRef.current;
    const rock = rockRef.current;
    if (!stage || !glyph || !rock) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let shake: Animation | null = null;
    let active = false;
    let disposed = false;
    const initialBounds = stage.getBoundingClientRect();
    let visible = initialBounds.bottom > 0 && initialBounds.top < innerHeight;

    function cancelShake() {
      clearTimeout(timer);
      timer = undefined;
      if (shake) {
        shake.onfinish = null;
        shake.cancel();
        shake = null;
      }
      stage!.dataset.medicationBottleShaking = "false";
    }

    function scheduleShake(delay: number) {
      if (!active || disposed || typeof rock!.animate !== "function") return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (!active || disposed) return;
        firstShakeRef.current = false;
        stage!.dataset.medicationBottleShaking = "true";
        // A little anticipation, two diminishing rattles, then a soft landing.
        shake = rock!.animate(
          [
            {
              transform: "translateX(0) rotate(0deg)",
              offset: 0,
              easing: "cubic-bezier(.55,0,.8,.45)",
            },
            {
              transform: "translateX(-.4px) rotate(-8deg)",
              offset: 0.16,
              easing: "cubic-bezier(.16,.8,.3,1)",
            },
            {
              transform: "translateX(.6px) rotate(11deg)",
              offset: 0.34,
              easing: "cubic-bezier(.55,0,.35,1)",
            },
            {
              transform: "translateX(-.35px) rotate(-7deg)",
              offset: 0.51,
              easing: "cubic-bezier(.3,0,.25,1)",
            },
            {
              transform: "translateX(.2px) rotate(4.4deg)",
              offset: 0.66,
              easing: "cubic-bezier(.4,0,.25,1)",
            },
            {
              transform: "translateX(-.1px) rotate(-2deg)",
              offset: 0.8,
              easing: "cubic-bezier(.3,0,.2,1)",
            },
            {
              transform: "translateX(0) rotate(.7deg)",
              offset: 0.91,
              easing: "cubic-bezier(.2,0,.2,1)",
            },
            { transform: "translateX(0) rotate(0deg)", offset: 1 },
          ],
          { duration: SHAKE_DURATION, easing: "linear", fill: "none" },
        );
        shake.onfinish = () => {
          shake = null;
          stage!.dataset.medicationBottleShaking = "false";
          // This is a start-to-start interval, including the completed rattle.
          scheduleShake(nextShakeInterval() - SHAKE_DURATION);
        };
      }, delay);
    }

    function updateActivity() {
      const reduced = motion.matches;
      const next =
        !paused &&
        !reduced &&
        visible &&
        document.visibilityState !== "hidden" &&
        !document.querySelector(
          '[data-slot="dialog-content"][data-open], [data-slot="drawer-popup"][data-open]',
        ) &&
        getPageEntryReadiness();
      stage!.dataset.medicationBottleActive = String(next);
      if (reduced) {
        enteredRef.current = true;
        settledRef.current = true;
        firstShakeRef.current = false;
        stage!.dataset.medicationBottlePhase = "settled";
      }
      if (next === active) return;
      active = next;
      if (!active) {
        cancelShake();
      } else if (!enteredRef.current) {
        enteredRef.current = true;
        stage!.dataset.medicationBottlePhase = "entering";
      } else if (settledRef.current) {
        scheduleShake(firstShakeRef.current ? 250 : nextShakeInterval());
      }
    }

    function finishEntry(event: AnimationEvent) {
      if (event.target !== glyph || settledRef.current) return;
      settledRef.current = true;
      stage!.dataset.medicationBottlePhase = "settled";
      scheduleShake(250);
    }

    glyph.addEventListener("animationend", finishEntry);
    document.addEventListener("visibilitychange", updateActivity);
    motion.addEventListener("change", updateActivity);
    const unsubscribe = subscribePageEntryReadiness(updateActivity);
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            updateActivity();
          })
        : null;
    observer?.observe(stage);
    const dialogs = new MutationObserver(updateActivity);
    dialogs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-open"],
    });
    updateActivity();

    return () => {
      disposed = true;
      stage.dataset.medicationBottleActive = "false";
      cancelShake();
      observer?.disconnect();
      dialogs.disconnect();
      unsubscribe();
      glyph.removeEventListener("animationend", finishEntry);
      document.removeEventListener("visibilitychange", updateActivity);
      motion.removeEventListener("change", updateActivity);
    };
  }, [paused]);

  return (
    <span
      ref={stageRef}
      className={styles.stage}
      aria-hidden="true"
      data-medication-bottle-phase="waiting"
      data-medication-bottle-active="false"
      data-medication-bottle-shaking="false"
    >
      <span className={styles.container} data-medication-bottle-container />
      <span
        ref={glyphRef}
        className={styles.glyph}
        data-medication-bottle-glyph
      >
        <span ref={rockRef} className={styles.rock} data-medication-bottle-rock>
          <PillBottle strokeWidth={2.25} />
        </span>
      </span>
    </span>
  );
}
