"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { APP_IRIDESCENCE } from "@/lib/app-theme";
import styles from "./iridescence.module.css";

/** Two composited light planes; no WebGL context or JavaScript render clock. */
export function Iridescence() {
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = field.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      node.dataset.active = String(!document.hidden && !reduced.matches);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);
  return (
    <div
      ref={field}
      className={styles.field}
      data-iridescence-field
      data-active="false"
      style={
        {
          "--iridescence-flow-duration": `${18 / APP_IRIDESCENCE.speed}s`,
          "--iridescence-crossflow-duration": `${27 / APP_IRIDESCENCE.speed}s`,
        } as CSSProperties
      }
    >
      <span className={styles.overlay} />
    </div>
  );
}
