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
    const frontBatches = new WeakMap<HTMLElement, Set<HTMLElement>>();
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    let settleFrame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = reduced.matches;
    let disposed = false;
    let revealInsets = { top: 0, bottom: 0 };

    const finish = (node: HTMLElement): void => {
      const wasDone = node.dataset.entranceState === "done";
      const id = node.dataset.intakeEntrance;
      if (id) seen.current.add(id);
      node.dataset.entranceState = "done";
      observer?.unobserve(node);
      watched.delete(node);
      active.delete(node);
      queued.delete(node);
      if (!wasDone && node.parentElement?.dataset.stackDepth === "0")
        queueMicrotask(() => {
          if (!disposed) sync();
        });
    };

    const flush = () => {
      frame = 0;
      // Query order stays chronological even when IO reports intersections in
      // another order, or several groups are disclosed in the same frame.
      const batch = Array.from(
        timeline.querySelectorAll<HTMLElement>(ENTRY),
      ).filter((node) => {
        if (!queued.has(node)) return false;
        if (node.dataset.entrancePreview === "true") return true;
        // Scroll restoration or a last-moment gesture can move a queued face
        // before IO delivers its next callback. Check its actual band now too.
        const bounds = node.getBoundingClientRect();
        const inBand =
          bounds.bottom >= revealInsets.top - 1 &&
          bounds.top <= window.innerHeight - revealInsets.bottom + 1;
        if (!inBand) {
          // Force a fresh sample: a gesture can leave and re-enter between IO
          // samples, otherwise its old "inside" state may never emit again.
          observer?.unobserve(node);
          observer?.observe(node);
        }
        return inBand;
      });
      queued.clear();
      const fronts = new Set(
        batch.filter(
          (node) =>
            node.parentElement?.dataset.stackDepth === "0" &&
            node.dataset.entranceExposed === "true" &&
            !seen.current.has(node.dataset.intakeEntrance ?? ""),
        ),
      );
      for (const front of fronts) frontBatches.set(front, fronts);
      const step = Math.min(180, 900 / Math.max(1, fronts.size - 1));
      const rearBatches = new Map<Element, { count: number; index: number }>();
      for (const node of batch) {
        if (
          Number(node.parentElement?.dataset.stackDepth ?? 0) === 0 ||
          seen.current.has(node.dataset.intakeEntrance ?? "")
        )
          continue;
        const group = node.closest("[data-intake-group]");
        if (!group) continue;
        const rear = rearBatches.get(group) ?? { count: 0, index: 0 };
        rear.count += 1;
        rearBatches.set(group, rear);
      }
      let index = 0;
      for (const node of batch) {
        const preview = node.dataset.entrancePreview === "true";
        if (node.dataset.entranceExposed !== "true" && !preview) continue;
        const id = node.dataset.intakeEntrance;
        if (!id || seen.current.has(id) || reduced.matches || document.hidden) {
          finish(node);
          continue;
        }
        seen.current.add(id);
        const rear = Number(node.parentElement?.dataset.stackDepth ?? 0) > 0;
        const group = node.closest<HTMLElement>("[data-intake-group]");
        const rearBatch = group ? rearBatches.get(group) : undefined;
        const delay = `${
          rear && rearBatch
            ? rearBatch.index++ *
              Math.min(150, 750 / Math.max(1, rearBatch.count - 1))
            : index++ * step
        }ms`;
        observer?.unobserve(node);
        watched.delete(node);
        node.style.setProperty("--intake-enter-delay", delay);
        if (node.parentElement?.dataset.stackRear === "false")
          node
            .closest<HTMLElement>("[data-intake-group]")
            ?.style.setProperty("--intake-enter-delay", delay);
        node.dataset.entranceState = "running";
        node.dataset.entranceKind = preview
          ? "preview"
          : rear
            ? "rear"
            : "card";
        active.add(node);
      }
    };

    const scheduleFlush = () => {
      if (settled && queued.size && !frame)
        frame = requestAnimationFrame(flush);
    };

    const createObserver = () => {
      if (typeof IntersectionObserver !== "function") return null;
      const shell = timeline.closest(".with-intake-dock");
      // The mobile action dock sits over the viewport. Its existing layout
      // reserve also includes the safe area, so entrances wait until clear of it.
      const viewportHeight = window.innerHeight;
      const travel = Math.min(56, Math.max(24, viewportHeight * 0.08));
      const dock =
        shell && window.matchMedia("(max-width: 767px)").matches
          ? Math.max(12, parseFloat(getComputedStyle(shell).paddingBottom) || 0)
          : 12;
      // A little actual travel inside the usable viewport precedes a reveal.
      // Keep a visible observation band even on short landscape windows, and
      // use intersection rather than a ratio so very tall notes can still enter.
      const bottom = Math.min(
        dock + travel,
        Math.max(0, viewportHeight - travel - 96),
      );
      revealInsets = { top: travel, bottom };
      return new IntersectionObserver(
        (entries, source) => {
          if (source !== observer) return;
          for (const entry of entries) {
            const node = entry.target as HTMLElement;
            if (
              !entry.isIntersecting ||
              entry.intersectionRect.width <= 0 ||
              entry.intersectionRect.height <= 0
            ) {
              // A fast scroll during the initial pause must not consume an
              // unseen card's one entrance after it has already left the band.
              queued.delete(node);
              continue;
            }
            if (
              node.dataset.entranceExposed !== "true" ||
              node.dataset.entranceState !== "pending"
            )
              continue;
            if (document.hidden || reduced.matches) {
              finish(node);
              continue;
            }
            queued.add(node);
          }
          scheduleFlush();
        },
        {
          threshold: [0, 0.01],
          rootMargin: `-${travel}px 0px -${bottom}px 0px`,
        },
      );
    };
    observer = createObserver();

    const sync = (): void => {
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
        const preview = node.dataset.entrancePreview === "true";
        if (node.dataset.entranceExposed !== "true" && !preview) {
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
        const rear = Number(node.parentElement?.dataset.stackDepth ?? 0) > 0;
        if (rear) {
          const front = node
            .closest("[data-intake-group]")
            ?.querySelector<HTMLElement>(
              '[data-stack-depth="0"] > [data-intake-entrance]',
            );
          const fronts = front && frontBatches.get(front);
          const mainPhaseDone =
            !fronts ||
            [...fronts].every(
              (node) =>
                !timeline.contains(node) ||
                node.dataset.entranceState === "done",
            );
          if (front?.dataset.entranceState === "done" && mainPhaseDone) {
            if (document.hidden) finish(node);
            else if (preview) {
              observer.unobserve(node);
              watched.delete(node);
              queued.add(node);
              scheduleFlush();
            } else {
              if (!watched.has(node) && !queued.has(node)) {
                node.dataset.entranceState = "pending";
                watched.add(node);
                observer.observe(node);
              }
            }
          } else {
            observer.unobserve(node);
            watched.delete(node);
            queued.delete(node);
            node.dataset.entranceState = "waiting";
          }
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
        (event.animationName === "intake-card-arrive" ||
          event.animationName === "intake-preview-arrive") &&
        event.target instanceof HTMLElement &&
        event.target.matches(ENTRY)
      )
        finish(event.target);
    };
    const onInteraction = (event: FocusEvent | PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const node = event.target.closest<HTMLElement>(ENTRY);
      const group = event.target.closest("[data-intake-group]");
      const front = group?.querySelector<HTMLElement>(
        '[data-stack-depth="0"] > [data-intake-entrance]',
      );
      if (front) frontBatches.delete(front);
      // Disclosure and keyboard focus release visible faces immediately. Capped,
      // unseen children retain their first entrance when disclosure reveals them.
      if (!node) {
        for (const member of group?.querySelectorAll<HTMLElement>(ENTRY) ?? [])
          if (
            member.dataset.entranceExposed === "true" ||
            member.dataset.entrancePreview === "true"
          )
            finish(member);
        return;
      }
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
      attributeFilter: ["data-entrance-exposed", "data-entrance-preview"],
    });
    timeline.addEventListener("animationend", onEnd);
    timeline.addEventListener("animationcancel", onEnd);
    timeline.addEventListener("focusin", onInteraction);
    timeline.addEventListener("pointerdown", onInteraction, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", sync);
    sync();
    if (!settled) {
      // Natural card measurements settle during layout/ResizeObserver updates.
      // Give that first rendered scene two frames, then a quiet half-second.
      settleFrame = requestAnimationFrame(() => {
        settleFrame = requestAnimationFrame(() => {
          settleTimer = setTimeout(() => {
            settled = true;
            scheduleFlush();
          }, 500);
        });
      });
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      if (settleTimer !== null) clearTimeout(settleTimer);
      mutations.disconnect();
      observer?.disconnect();
      timeline.removeEventListener("animationend", onEnd);
      timeline.removeEventListener("animationcancel", onEnd);
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
