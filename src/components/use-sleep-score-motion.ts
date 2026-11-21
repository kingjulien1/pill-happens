"use client";

import { useEffect, useRef } from "react";

/** Pause the dial's CSS animation when hidden, closed or motion is reduced. */
export function useSleepScoreMotion(enabled: boolean) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dial = anchor.current;
    if (!dial || !enabled) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver !== "function";
    const sync = () => {
      dial.dataset.active = String(
        visible &&
          !document.hidden &&
          !motion.matches &&
          !dial.closest('[inert], [aria-hidden="true"], [data-closed]'),
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
    intersection?.observe(dial);
    const visibility = new MutationObserver(sync);
    for (
      let element = dial.parentElement;
      element;
      element = element.parentElement
    ) {
      visibility.observe(element, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "data-closed"],
      });
    }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    if (!intersection) sync();
    return () => {
      dial.dataset.active = "false";
      intersection?.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [enabled]);
  return anchor;
}
