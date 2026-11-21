"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./responsive-modal.module.css";

/** One opening curtain, behind the content; removed when its reveal completes. */
export function IntakeDialogReveal() {
  const layer = useRef<HTMLSpanElement>(null);
  const [finished, setFinished] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useLayoutEffect(() => {
    const node = layer.current;
    const surface = node?.parentElement;
    if (!node || !surface || finished) return;
    const measure = () => {
      // Exclude the curtain's own overflow when measuring the scroll content.
      node.style.height = "0px";
      node.style.height = `${Math.max(surface.scrollHeight, surface.clientHeight)}px`;
      node.style.setProperty(
        "--intake-reveal-travel",
        `${surface.clientHeight + 52}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skip = () => {
      if (motion.matches) setFinished(true);
    };
    motion.addEventListener("change", skip);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", skip);
    };
  }, [finished]);

  if (finished) return null;
  return (
    <span
      ref={layer}
      className={styles.intakeRevealClip}
      aria-hidden="true"
      data-intake-opening-background
    >
      <span
        className={styles.intakeRevealVeil}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          event.stopPropagation();
          setFinished(true);
        }}
      />
    </span>
  );
}
