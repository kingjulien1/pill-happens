"use client";

import { useEffect, useRef } from "react";
import styles from "./action-button.module.css";

/** One clipped reflection, with no opacity applied to the copy or moving rim. */
export function ActionButtonTint() {
  const layer = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = layer.current;
    const button = node?.closest("button, a");
    if (!node || !button) return;
    let visible = true;
    const sync = () => {
      const paused = !visible || document.hidden;
      node.dataset.tintPaused = String(paused);
      (button as HTMLElement).style.setProperty(
        "--action-paint-visibility",
        paused ? "paused" : "running",
      );
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            sync();
          });
    observer?.observe(button);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      (button as HTMLElement).style.removeProperty("--action-paint-visibility");
    };
  }, []);

  return (
    <span
      ref={layer}
      className={styles.tint}
      data-action-tint
      aria-hidden="true"
    >
      <span className={styles.tintFlow} data-action-tint-flow />
    </span>
  );
}
