"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/** Keeps the decorative surface and border notch tied to the actual disclosure. */
export function useIntakeGroupSurface(enabled: boolean) {
  const groupRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const label = labelRef.current;
    if (!enabled || !group || !label) return;
    const measure = (width = label.offsetWidth) =>
      group.style.setProperty("--intake-group-toggle-width", `${width}px`);
    measure();
    const observer = new ResizeObserver(([entry]) => {
      // Local box geometry must not inherit a parent stack's temporary scale.
      measure(entry.borderBoxSize?.[0]?.inlineSize ?? label.offsetWidth);
    });
    observer.observe(label);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    const group = groupRef.current;
    if (!enabled || !group) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      group.dataset.surfaceActive = String(
        visible && !document.hidden && !reduced.matches,
      );
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    if (observer) observer.observe(group);
    else {
      visible = true;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      group.dataset.surfaceActive = "false";
    };
  }, [enabled]);

  return { groupRef, labelRef };
}
