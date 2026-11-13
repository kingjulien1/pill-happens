"use client";

import { useLayoutEffect, type RefObject } from "react";

export const INTAKE_DOCK_RESIZE_EVENT = "pill:intake-dock-resize";

/** The portaled dock and the page share one measured scroll/focus clearance. */
export function useIntakeDock(
  dockRef: RefObject<HTMLElement | null>,
  mobile: boolean,
) {
  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!mobile || !dock) return;

    const root = document.documentElement;
    const property = "--intake-dock-height";
    const previousHeight = root.style.getPropertyValue(property);
    const previousPriority = root.style.getPropertyPriority(property);
    const previousDocked = root.getAttribute("data-intake-docked");
    let height = 0;
    let frame = 0;

    const notify = () =>
      window.dispatchEvent(new Event(INTAKE_DOCK_RESIZE_EVENT));
    const measure = (viewportChanged = false) => {
      const next = Math.ceil(dock.getBoundingClientRect().height);
      const changed = next > 0 && next !== height;
      if (changed) {
        height = next;
        root.style.setProperty(property, `${next}px`);
      }
      if (changed || viewportChanged) notify();
    };
    const onViewportChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure(true);
      });
    };

    root.setAttribute("data-intake-docked", "true");
    // Measure before workspace scroll restoration or the first visible paint.
    measure();
    const resize =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => measure())
        : null;
    resize?.observe(dock);
    window.addEventListener("resize", onViewportChange, { passive: true });
    window.visualViewport?.addEventListener("resize", onViewportChange, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      if (previousHeight)
        root.style.setProperty(property, previousHeight, previousPriority);
      else root.style.removeProperty(property);
      if (previousDocked === null) root.removeAttribute("data-intake-docked");
      else root.setAttribute("data-intake-docked", previousDocked);
      notify();
    };
  }, [dockRef, mobile]);
}
