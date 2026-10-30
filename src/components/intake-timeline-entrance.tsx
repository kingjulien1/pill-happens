"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const ENTRY = "[data-intake-entrance]";

/** Reveal each intake once, in small viewport-sized batches rather than a long queue. */
export function IntakeTimelineEntrance({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  useLayoutEffect(() => {
    const timeline = root.current;
    if (!timeline) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const watched = new Set<HTMLElement>();
    const queued = new Set<HTMLElement>();
    const active = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let frame = 0;

    const finish = (node: HTMLElement) => {
      const id = node.dataset.intakeEntrance;
      if (id) seen.current.add(id);
      node.dataset.entranceState = "done";
      observer?.unobserve(node);
      watched.delete(node);
      active.delete(node);
      queued.delete(node);
    };

    const flush = () => {
      frame = 0;
      // Query order stays chronological even when IO reports intersections in
      // another order, or several groups are disclosed in the same frame.
      const batch = Array.from(
        timeline.querySelectorAll<HTMLElement>(ENTRY),
      ).filter((node) => queued.has(node));
      queued.clear();
      const step = Math.min(85, 510 / Math.max(1, batch.length - 1));
      let index = 0;
      for (const node of batch) {
        if (node.dataset.entranceExposed !== "true") continue;
        const id = node.dataset.intakeEntrance;
        if (!id || seen.current.has(id) || reduced.matches || document.hidden) {
          finish(node);
          continue;
        }
        seen.current.add(id);
        const delay = `${index++ * step}ms`;
        node.style.setProperty("--intake-enter-delay", delay);
        if (node.parentElement?.dataset.stackRear === "false")
          node
            .closest<HTMLElement>("[data-intake-group]")
            ?.style.setProperty("--intake-enter-delay", delay);
        node.dataset.entranceState = "running";
        active.add(node);
      }
    };

    const createObserver = () => {
      if (typeof IntersectionObserver !== "function") return null;
      const shell = timeline.closest(".with-intake-dock");
      // The mobile action dock sits over the viewport. Its existing layout
      // reserve also includes the safe area, so entrances wait until clear of it.
      const bottom =
        shell && window.matchMedia("(max-width: 767px)").matches
          ? Math.max(12, parseFloat(getComputedStyle(shell).paddingBottom) || 0)
          : 12;
      return new IntersectionObserver(
        (entries, source) => {
          if (source !== observer) return;
          for (const entry of entries) {
            const node = entry.target as HTMLElement;
            if (
              !entry.isIntersecting ||
              node.dataset.entranceExposed !== "true" ||
              node.dataset.entranceState !== "pending"
            )
              continue;
            observer?.unobserve(node);
            watched.delete(node);
            if (document.hidden || reduced.matches) {
              finish(node);
              continue;
            }
            queued.add(node);
          }
          if (queued.size && !frame) frame = requestAnimationFrame(flush);
        },
        { threshold: 0.06, rootMargin: `0px 0px -${bottom}px 0px` },
      );
    };
    observer = createObserver();

    const sync = () => {
      for (const node of [...watched, ...active]) {
        if (!timeline.contains(node)) {
          observer?.unobserve(node);
          watched.delete(node);
          queued.delete(node);
          active.delete(node);
        }
      }
      for (const node of timeline.querySelectorAll<HTMLElement>(ENTRY)) {
        const id = node.dataset.intakeEntrance;
        if (node.dataset.entranceExposed !== "true") {
          observer?.unobserve(node);
          watched.delete(node);
          queued.delete(node);
          if (active.has(node)) finish(node);
          else node.dataset.entranceState = "idle";
          continue;
        }
        if (!observer || reduced.matches || !id || seen.current.has(id)) {
          if (!active.has(node) || reduced.matches) finish(node);
          observer?.unobserve(node);
          watched.delete(node);
          continue;
        }
        if (!watched.has(node) && !queued.has(node)) {
          node.dataset.entranceState = "pending";
          watched.add(node);
          observer.observe(node);
        }
      }
    };

    const onEnd = (event: AnimationEvent) => {
      if (
        event.animationName === "intake-card-arrive" &&
        event.target instanceof HTMLElement &&
        event.target.matches(ENTRY)
      )
        finish(event.target);
    };
    const onInteraction = (event: FocusEvent | PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const node =
        event.target.closest<HTMLElement>(ENTRY) ??
        event.target
          .closest("[data-intake-group]")
          ?.querySelector<HTMLElement>(
            `${ENTRY}[data-entrance-state="running"], ${ENTRY}[data-entrance-state="pending"]`,
          );
      if (node && node.dataset.entranceState !== "done") finish(node);
    };
    const onVisibility = () => {
      if (!document.hidden) return;
      for (const node of [...active, ...queued]) finish(node);
    };
    const onResize = () => {
      observer?.disconnect();
      for (const node of queued) watched.add(node);
      queued.clear();
      observer = createObserver();
      for (const node of watched) observer?.observe(node);
      sync();
    };
    const mutations = new MutationObserver(sync);
    mutations.observe(timeline, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-entrance-exposed"],
    });
    timeline.addEventListener("animationend", onEnd);
    timeline.addEventListener("focusin", onInteraction);
    timeline.addEventListener("pointerdown", onInteraction, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer?.disconnect();
      timeline.removeEventListener("animationend", onEnd);
      timeline.removeEventListener("focusin", onInteraction);
      timeline.removeEventListener("pointerdown", onInteraction, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      reduced.removeEventListener("change", sync);
      for (const node of timeline.querySelectorAll<HTMLElement>(ENTRY))
        node.dataset.entranceState = "done";
    };
  }, []);

  return (
    <div ref={root} className="intake-timeline">
      {children}
    </div>
  );
}
