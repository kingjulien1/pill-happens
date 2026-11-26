"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export const CONFIRMATION_PAUSE_MS = 300;
export const RESET_EXIT_MS = 3000;
export const DELETE_EXIT_MS = 3500;

// Keep the overlay aligned with the popup while its form scrolls underneath.
export function useDialogSweepFrame(
  marker: RefObject<HTMLElement | null>,
  active: boolean,
  direction: "up" | "down",
) {
  const [frame, setFrame] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const surface = marker.current?.closest<HTMLElement>(
      "[data-dialog-surface]",
    );
    if (!active || !surface) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (direction === "up" && reduced.matches) return;
    const measure = () => setFrame(surface.getBoundingClientRect());
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    window.addEventListener("resize", measure);

    const scroller = surface.matches("[data-dialog-scroll]")
      ? surface
      : surface.querySelector<HTMLElement>("[data-dialog-scroll]");
    let frameId = 0;
    if (scroller && !reduced.matches) {
      const down = direction === "down";
      const start = performance.now() + (down ? 100 : 460);
      const duration = down ? 1750 : 2140;
      const follow = (now: number) => {
        if (reduced.matches) return;
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        const eased = t * t * (3 - 2 * t);
        // A reset can shorten or lengthen the form during this pass.
        const distance = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTop = distance * (down ? eased : 1 - eased);
        if (t < 1) frameId = requestAnimationFrame(follow);
      };
      follow(performance.now());
    }
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active, direction, marker]);
  return frame;
}
