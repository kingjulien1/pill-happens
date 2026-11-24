"use client";

import { useEffect, useRef } from "react";

/** Let visible artwork advance its CSS timeline while its dialog is active. */
export function useVisibleMotion<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean,
) {
  const anchor = useRef<T>(null);
  useEffect(() => {
    const element = anchor.current;
    if (!element || !enabled) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver !== "function";
    const sync = () => {
      element.dataset.active = String(
        visible &&
          !document.hidden &&
          !motion.matches &&
          !element.closest('[inert], [aria-hidden="true"], [data-closed]'),
      );
    };
    const intersection =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting && entry.intersectionRatio > 0.15;
              sync();
            },
            { threshold: [0, 0.15] },
          )
        : null;
    intersection?.observe(element);
    const visibility = new MutationObserver(sync);
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      visibility.observe(parent, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "data-closed"],
      });
    }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    if (!intersection) sync();
    return () => {
      element.dataset.active = "false";
      intersection?.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [enabled]);
  return anchor;
}
