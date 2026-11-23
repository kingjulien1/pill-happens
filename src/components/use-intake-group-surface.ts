"use client";

import { useLayoutEffect, useRef } from "react";

/** Join intake controls precisely; legacy history washes retain their own stops. */
export function useIntakeGroupSurface(enabled: boolean) {
  const groupRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const label = labelRef.current;
    if (!enabled || !group || !label) return;
    const cards = group.querySelector<HTMLElement>(".intake-group-cards");
    const glass = group.querySelector<HTMLElement>(".intake-group-glass");
    if (!cards || !glass) return;
    let frame: number | null = null;
    let disposed = false;
    const write = (name: string, value: number) => {
      const next = `${Math.round(value * 100) / 100}px`;
      if (group.style.getPropertyValue(name) !== next)
        group.style.setProperty(name, next);
    };
    if (group.hasAttribute("data-intake-group")) {
      const measureJoin = () => {
        if (disposed) return;
        // The joined frame/control fade without transforms. Read fractional
        // edges so high-DPI Safari never gets an offsetWidth rounding gap.
        const control = label.getBoundingClientRect();
        const surface = glass.getBoundingClientRect();
        if (control.width <= 0 || surface.width <= 0) return;
        write("--intake-group-toggle-width", control.width);
        write("--intake-group-notch-left", control.left - surface.left);
        write("--intake-group-notch-right", control.right - surface.left);
        write("--intake-group-join-bottom", surface.bottom - control.top);
      };
      measureJoin();
      const sizes = new Map<Element, string>();
      const resize = new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          // Disclosure changes only height. Both bottom edges travel together,
          // so a height-only frame update needs no geometry reads or writes.
          const size =
            entry.target === glass
              ? String(entry.contentRect.width)
              : `${entry.contentRect.width}:${entry.contentRect.height}`;
          if (sizes.get(entry.target) !== size) changed = true;
          sizes.set(entry.target, size);
        }
        if (changed) measureJoin();
      });
      resize.observe(label);
      resize.observe(glass);
      return () => {
        disposed = true;
        resize.disconnect();
      };
    }
    const measure = () => {
      // offset geometry excludes page/card entrance transforms. The slot's own
      // matrix includes only its current disclosure translation and scale.
      write("--intake-group-toggle-width", label.offsetWidth);
      const surfaceHeight = glass.clientHeight;
      if (surfaceHeight <= 0) return;
      let last = { top: 0, height: cards.offsetHeight, bottom: 0 };
      for (const slot of cards.querySelectorAll<HTMLElement>(
        ":scope > .intake-stack-slot",
      )) {
        const paint = getComputedStyle(slot);
        if (
          paint.visibility === "hidden" ||
          paint.display === "none" ||
          Number(paint.opacity) <= 0 ||
          slot.offsetHeight <= 0
        )
          continue;
        const matrix = new DOMMatrixReadOnly(
          paint.transform === "none" ? undefined : paint.transform,
        );
        const height = slot.offsetHeight * Math.abs(matrix.m22);
        const top =
          cards.offsetTop - glass.offsetTop + slot.offsetTop + matrix.m42;
        const bottom = top + height;
        if (bottom >= last.bottom) last = { top, height, bottom };
      }
      const clamp = (value: number) =>
        Math.max(0, Math.min(surfaceHeight, value));
      write(
        "--intake-group-pink-fade-start",
        clamp(last.top + last.height * 0.62),
      );
      write(
        "--intake-group-purple-fade-start",
        clamp(last.top + last.height * 0.5),
      );
      write(
        "--intake-group-purple-fade-end",
        clamp(last.top + last.height * 0.92),
      );
    };
    const tick = () => {
      frame = null;
      if (disposed) return;
      measure();
      // A short-lived clock follows the moving last card and stops at rest.
      if (group.dataset.stackMoving === "true")
        frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };
    measure();
    const resize = new ResizeObserver(schedule);
    resize.observe(label);
    resize.observe(cards);
    resize.observe(glass);
    const changes = new MutationObserver(schedule);
    changes.observe(group, {
      attributes: true,
      attributeFilter: ["data-stack-moving", "data-expanded"],
    });
    changes.observe(cards, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "data-stack-hidden"],
    });
    return () => {
      disposed = true;
      resize.disconnect();
      changes.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return { groupRef, labelRef };
}
