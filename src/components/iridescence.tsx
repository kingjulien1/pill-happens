"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { APP_IRIDESCENCE } from "@/lib/app-theme";
import styles from "./iridescence.module.css";

/** Two composited light planes; no WebGL context or JavaScript render clock. */
export function Iridescence({
  scope = "page",
}: {
  scope?: "page" | "surface";
}) {
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = field.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible =
      scope === "page" || typeof IntersectionObserver !== "function";
    const sync = () => {
      node.dataset.active = String(
        visible && !document.hidden && !reduced.matches,
      );
    };
    const observer =
      scope === "surface" && typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    observer?.observe(node);
    sync();
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      node.dataset.active = "false";
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [scope]);
  return (
    <div
      ref={field}
      className={styles.field}
      data-iridescence-field
      data-iridescence-scope={scope}
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
