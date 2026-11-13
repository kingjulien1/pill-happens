"use client";

import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import {
  reserveCardEntryDelays,
  resetCardEntryDelaysIfIdle,
} from "@/lib/card-entry-timing";
import { INTAKE_DOCK_RESIZE_EVENT } from "@/components/use-intake-dock";

const CARD =
  '[data-card-entry]:not([data-card-entry="false"]), .surface, .empty-intake-card, [data-medication-history-notice]';
const EXCLUDED =
  '[data-log-entry-scope], .intake-timeline, [data-intake-entrance], [data-streak-spotlight], [role="dialog"], [role="listbox"], [role="menu"], [data-medication-appearance], [data-appearance-preview]';

/** Ordinary page cards share a clock with the intake-specific stack controller. */
export function CardEntrySequence({
  children,
  ...props
}: ComponentProps<"div">) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(new WeakSet<HTMLElement>());

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const cards = new Set<HTMLElement>();
    const queued = new Set<HTMLElement>();
    const active = new Set<HTMLElement>();
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    let refreshFrame = 0;
    let scrollFrame = 0;
    let disposed = false;

    const rendered = (node: HTMLElement) => {
      if (node.closest('[hidden], [aria-hidden="true"]')) return false;
      for (
        let parent = node.parentElement;
        parent && parent !== scope;
        parent = parent.parentElement
      ) {
        if (parent instanceof HTMLDetailsElement && !parent.open) {
          const summary = parent.querySelector(":scope > summary");
          if (!summary?.contains(node)) return false;
        }
      }
      const style = getComputedStyle(node);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        node.getClientRects().length > 0
      );
    };
    const inViewport = (node: HTMLElement) => {
      const bounds = node.getBoundingClientRect();
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight &&
        bounds.right > 0 &&
        bounds.left < innerWidth
      );
    };
    const finish = (node: HTMLElement) => {
      seen.current.add(node);
      node.dataset.cardEntryState = "done";
      observer?.unobserve(node);
      queued.delete(node);
      active.delete(node);
      // A flush assigns all its reserved slots synchronously before resetting.
      queueMicrotask(() => {
        if (!disposed) resetCardEntryDelaysIfIdle(scope);
      });
    };
    const flush = () => {
      frame = 0;
      if (!getPageEntryReadiness() || document.hidden) return;
      const batch = Array.from(
        scope.querySelectorAll<HTMLElement>(CARD),
      ).filter(
        (node) =>
          queued.has(node) &&
          rendered(node) &&
          inViewport(node) &&
          !seen.current.has(node),
      );
      queued.clear();
      if (reduced.matches) {
        for (const node of batch) finish(node);
        return;
      }
      const delays = reserveCardEntryDelays(scope, batch.length);
      for (const [index, node] of batch.entries()) {
        node.style.setProperty("--card-entry-delay", `${delays[index]}ms`);
        node.dataset.cardEntryState = "running";
        seen.current.add(node);
        active.add(node);
      }
    };
    const queueFlush = () => {
      if (getPageEntryReadiness() && !document.hidden && !frame && queued.size)
        frame = requestAnimationFrame(flush);
    };
    const createObserver = () => {
      if (typeof IntersectionObserver !== "function") return null;
      const dock =
        document.documentElement.dataset.intakeDocked === "true"
          ? (parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--intake-dock-height",
              ),
            ) || 0) + 24
          : 16;
      const bottom = Math.min(dock, Math.max(16, innerHeight - 96));
      return new IntersectionObserver(
        (entries, source) => {
          if (source !== observer) return;
          for (const entry of entries) {
            const node = entry.target as HTMLElement;
            if (document.hidden) {
              queued.delete(node);
              observer?.unobserve(node);
              continue;
            }
            if (!entry.isIntersecting || !rendered(node)) {
              queued.delete(node);
              if (active.has(node) && (!rendered(node) || !inViewport(node)))
                finish(node);
            } else if (node.dataset.cardEntryState === "pending") {
              queued.add(node);
            }
          }
          queueFlush();
        },
        { threshold: [0, 0.01], rootMargin: `-16px 0px -${bottom}px 0px` },
      );
    };
    observer = createObserver();

    const sync = () => {
      const candidates = Array.from(scope.querySelectorAll<HTMLElement>(CARD));
      const eligible = candidates.filter((node) => {
        if (
          node.dataset.cardEntry === "false" ||
          node.closest(EXCLUDED) ||
          node.closest("[data-card-entry-scope]") !== scope
        )
          return false;
        // One transform per actual card; nested specimens stay in their parent.
        for (
          let parent = node.parentElement;
          parent && parent !== scope;
          parent = parent.parentElement
        )
          if (
            parent.matches(CARD) &&
            parent.dataset.cardEntry !== "false" &&
            !parent.closest(EXCLUDED)
          )
            return false;
        return true;
      });
      const current = new Set(eligible);
      for (const node of cards) {
        if (!current.has(node)) {
          finish(node);
          cards.delete(node);
        }
      }
      for (const node of eligible) {
        const fresh = !cards.has(node);
        cards.add(node);
        if (reduced.matches || !observer || seen.current.has(node)) {
          if (!active.has(node) || reduced.matches) finish(node);
          continue;
        }
        if (!rendered(node)) {
          queued.delete(node);
          observer.unobserve(node);
          if (active.has(node)) finish(node);
          continue;
        }
        if (fresh || !node.dataset.cardEntryState)
          node.dataset.cardEntryState = "pending";
        // A Home Screen app can mount while its document is still hidden.
        // Keep unseen cards eligible until that first real visible frame.
        if (document.hidden) {
          queued.delete(node);
          observer.unobserve(node);
          continue;
        }
        observer.observe(node);
      }
    };
    const scheduleSync = () => {
      if (!refreshFrame)
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          sync();
        });
    };
    const settleTarget = (target: Element | null) => {
      for (let node = target; node && node !== scope; node = node.parentElement)
        if (node instanceof HTMLElement && cards.has(node)) finish(node);
    };
    const onInteraction = (event: Event) => {
      if (event.target instanceof Element) settleTarget(event.target);
    };
    const onHash = () => {
      try {
        settleTarget(
          document.getElementById(decodeURIComponent(location.hash.slice(1))),
        );
      } catch {
        // Malformed external fragments must not interrupt card rendering.
      }
    };
    const onEnd = (event: AnimationEvent) => {
      if (
        event.animationName === "card-entry-arrive" &&
        event.target instanceof HTMLElement &&
        cards.has(event.target)
      )
        finish(event.target);
    };
    const onScroll = () => {
      if (!scrollFrame && active.size)
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          for (const node of active) if (!inViewport(node)) finish(node);
        });
    };
    const onVisibility = () => {
      if (document.hidden) {
        for (const node of active) finish(node);
        for (const node of queued) observer?.unobserve(node);
        queued.clear();
      } else sync();
    };
    const onResize = () => {
      observer?.disconnect();
      observer = createObserver();
      sync();
    };
    const mutations = new MutationObserver(scheduleSync);
    mutations.observe(scope, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "open", "class", "aria-hidden"],
    });
    scope.addEventListener("animationend", onEnd);
    scope.addEventListener("animationcancel", onEnd);
    scope.addEventListener("focusin", onInteraction);
    scope.addEventListener("pointerdown", onInteraction, true);
    scope.addEventListener("toggle", onInteraction, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    window.addEventListener(INTAKE_DOCK_RESIZE_EVENT, onResize);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", sync);
    const unsubscribeEntry = subscribePageEntryReadiness(() => {
      if (!getPageEntryReadiness()) return;
      sync();
      queueFlush();
    });
    sync();
    onHash();
    return () => {
      disposed = true;
      unsubscribeEntry();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(refreshFrame);
      cancelAnimationFrame(scrollFrame);
      mutations.disconnect();
      observer?.disconnect();
      scope.removeEventListener("animationend", onEnd);
      scope.removeEventListener("animationcancel", onEnd);
      scope.removeEventListener("focusin", onInteraction);
      scope.removeEventListener("pointerdown", onInteraction, true);
      scope.removeEventListener("toggle", onInteraction, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
      window.removeEventListener(INTAKE_DOCK_RESIZE_EVENT, onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", sync);
      for (const node of cards) node.dataset.cardEntryState = "done";
      resetCardEntryDelaysIfIdle(scope);
    };
  }, []);

  return (
    <div {...props} ref={root} data-card-entry-scope>
      {children}
    </div>
  );
}
