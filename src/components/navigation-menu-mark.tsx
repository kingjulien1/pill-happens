"use client";

import { useEffect, useRef } from "react";
import styles from "./navigation-menu-mark.module.css";

/** Three familiar lines; one very small, unhurried ripple passes through them. */
export function NavigationMenuMark({ open = false }: { open?: boolean }) {
  const mark = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = mark.current;
    if (!element) return;
    let visible = !("IntersectionObserver" in window);
    const sync = () => {
      element.dataset.menuMarkPaused = String(document.hidden || !visible);
    };
    const intersection =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    intersection?.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <svg
      ref={mark}
      className={styles.mark}
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      data-menu-mark
      data-menu-mark-open={open}
      data-menu-mark-paused="true"
    >
      <path className={styles.line} d="M4 6h16" />
      <path className={styles.line} d="M4 12h16" />
      <path className={styles.line} d="M4 18h16" />
    </svg>
  );
}
