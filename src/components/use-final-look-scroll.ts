"use client";

import { useLayoutEffect, useRef } from "react";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);

/** Cache layout separately: scrolling reads only the pane offset, never card boxes. */
export function useFinalLookScroll(enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const heading = ref.current;
    const section = heading?.closest<HTMLElement>("[data-final-look-section]");
    if (!heading || !section) return;
    const pane = heading.closest<HTMLElement>("[data-dialog-scroll]");
    const popup = pane?.closest<HTMLElement>(
      '[data-slot="dialog-content"], [data-slot="drawer-popup"]',
    );
    const scroller = pane ?? window;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let frame = 0;
    let needsMeasure = true;
    let start = 0;
    let distance = 1;
    let height = 0;
    let previous = "";
    const top = () => pane?.scrollTop ?? window.scrollY;
    const paint = (progress: number) => {
      const next = progress.toFixed(4);
      if (next === previous) return;
      previous = next;
      heading.style.setProperty(
        "--final-look-scale",
        String(0.5 + 0.5 * ease(progress)),
      );
      heading.style.setProperty(
        "--final-look-lines",
        String(ease(clamp((progress - 0.8) / 0.2))),
      );
    };
    const update = () => {
      frame = 0;
      if (disposed || document.hidden) return;
      if (motion.matches) {
        paint(1);
        return;
      }
      if (needsMeasure) {
        const viewportTop = pane
          ? pane.getBoundingClientRect().top + pane.clientTop
          : 0;
        const headingTop = heading.getBoundingClientRect().top;
        start = headingTop - viewportTop + top();
        distance = Math.max(
          1,
          section.getBoundingClientRect().bottom - headingTop,
        );
        height = pane?.clientHeight ?? window.innerHeight;
        needsMeasure = false;
      }
      paint(clamp((top() + height - start) / distance));
    };
    const schedule = () => {
      if (!disposed && !document.hidden && !frame)
        frame = requestAnimationFrame(update);
    };
    const measure = () => {
      needsMeasure = true;
      schedule();
    };
    const scroll = () => {
      if (motion.matches) return;
      // Outside the growth interval the cached value is unchanged: no frame
      // or observer callback is needed, including during a fast Safari swipe.
      const next = clamp((top() + height - start) / distance).toFixed(4);
      if (needsMeasure || next !== previous) schedule();
    };
    const settle = (event: Event) => {
      if (event.target === popup) measure();
    };
    const resize = new ResizeObserver(measure);
    for (const element of new Set([
      section,
      heading,
      heading.closest("form"),
      pane,
    ]))
      if (element) resize.observe(element);
    scroller.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure, {
      passive: true,
    });
    document.addEventListener("visibilitychange", measure);
    motion.addEventListener("change", measure);
    popup?.addEventListener("animationend", settle);
    popup?.addEventListener("transitionend", settle);
    void document.fonts?.ready.then(() => {
      if (!disposed) measure();
    });
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      scroller.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
      motion.removeEventListener("change", measure);
      popup?.removeEventListener("animationend", settle);
      popup?.removeEventListener("transitionend", settle);
    };
  }, [enabled]);
  return ref;
}
