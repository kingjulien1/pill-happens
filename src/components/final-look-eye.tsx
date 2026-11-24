"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Eye } from "lucide-react";
import styles from "./final-look-eye.module.css";

const BLINK_DURATION = 1_280;

/** One idle timeout, only while visible; blinking never rerenders the form. */
export function FinalLookEye() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const eye = ref.current;
    if (!eye) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = !("IntersectionObserver" in window);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      delete eye.dataset.blinking;
    };
    const schedule = (afterBlink = false) => {
      stop();
      if (!visible || document.hidden || motion.matches) return;
      timer = setTimeout(
        () => {
          eye.dataset.blinking = "true";
        },
        13_000 - (afterBlink ? BLINK_DURATION : 0),
      );
    };
    const ended = (event: AnimationEvent) => {
      // The scene owns completion, so the last ripple can finish after the lid.
      if (event.target === eye && eye.dataset.blinking) schedule(true);
    };
    const sync = () => schedule();
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver((entries) => {
            for (const entry of entries) visible = entry.isIntersecting;
            schedule();
          })
        : null;
    observer?.observe(eye);
    eye.addEventListener("animationend", ended);
    eye.addEventListener("animationcancel", ended);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    if (!observer) schedule();
    return () => {
      stop();
      observer?.disconnect();
      eye.removeEventListener("animationend", ended);
      eye.removeEventListener("animationcancel", ended);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <span
      ref={ref}
      className={styles.eye}
      style={{ "--eye-blink-duration": `${BLINK_DURATION}ms` } as CSSProperties}
      aria-hidden="true"
      data-final-look-eye
    >
      <span className={styles.halo} />
      <Eye className={styles.glyph} data-eye-glyph strokeWidth={2.5} />
      <svg
        className={styles.lid}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M3 12q9 2 18 0" />
      </svg>
      <svg
        className={styles.burst}
        viewBox="-12 -12 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      >
        <circle className={styles.ring} cx="12" cy="12" r="10" />
        <ellipse className={styles.echo} cx="12" cy="12" rx="12" ry="9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
          <g key={angle} transform={`rotate(${angle} 12 12)`}>
            <path
              className={styles.ray}
              d="M12 2V-3"
              pathLength="1"
              style={{ animationDelay: `${260 + index * 9}ms` }}
            />
          </g>
        ))}
        {[22.5, 112.5, 202.5, 292.5].map((angle, index) => (
          <g key={angle} transform={`rotate(${angle} 12 12)`}>
            <path
              className={styles.spark}
              d="m12-7 1.1 2.9L16-3l-2.9 1.1L12 1l-1.1-2.9L8-3l2.9-1.1Z"
              style={{ animationDelay: `${330 + index * 28}ms` }}
            />
            <circle
              className={styles.mote}
              cx="12"
              cy="-1"
              r="1.3"
              style={{ animationDelay: `${410 + index * 24}ms` }}
            />
          </g>
        ))}
      </svg>
    </span>
  );
}
