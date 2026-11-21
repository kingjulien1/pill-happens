"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import styles from "./final-look-eye.module.css";

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
        4_000 + Math.random() * 5_000 - (afterBlink ? 620 : 0),
      );
    };
    const ended = (event: AnimationEvent) => {
      if (event.target === eye.querySelector("[data-eye-glyph]"))
        schedule(true);
    };
    const sync = () => schedule();
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            schedule();
          })
        : null;
    observer?.observe(eye);
    eye.addEventListener("animationend", ended);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    if (!observer) schedule();
    return () => {
      stop();
      observer?.disconnect();
      eye.removeEventListener("animationend", ended);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <span
      ref={ref}
      className={styles.eye}
      aria-hidden="true"
      data-final-look-eye
    >
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
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      >
        <circle className={styles.ring} cx="12" cy="12" r="5" />
        <g className={styles.rays}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <path
              key={angle}
              d="M12 3v1.5"
              transform={`rotate(${angle} 12 12)`}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
