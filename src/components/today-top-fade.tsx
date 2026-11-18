"use client";

import { useLayoutEffect } from "react";
import styles from "./today-top-fade.module.css";

/** Paint from the document top to the wake-up value, outside all entry transforms. */
export function TodayTopFade() {
  useLayoutEffect(() => {
    const today = document.querySelector<HTMLElement>("[data-today-layout]");
    const value = today?.querySelector<HTMLElement>(
      '[data-day-time-marker="start"] time',
    );
    if (!today || !value) return;

    const fade = document.createElement("div");
    fade.className = styles.fade;
    fade.setAttribute("data-today-top-fade", "");
    fade.setAttribute("aria-hidden", "true");
    document.body.append(fade);
    let frame = 0;
    let disposed = false;

    const measure = () => {
      frame = 0;
      // Both boxes move together on scroll, keeping the fade in document space.
      const height = Math.max(
        0,
        value.getBoundingClientRect().top -
          document.body.getBoundingClientRect().top,
      );
      fade.style.height = `${height}px`;
    };
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    };

    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    for (const element of [
      today.closest("[data-page-layout]"),
      document.querySelector("[data-page-topbar]"),
      document.querySelector("[data-page-topbar-separator]"),
      value.parentElement,
      value,
    ])
      if (element) observer?.observe(element);

    measure();
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, {
      passive: true,
    });
    void document.fonts?.ready.then(schedule);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      fade.remove();
    };
  }, []);

  return null;
}
