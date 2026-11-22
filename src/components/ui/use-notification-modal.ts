"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { useScrollLock } from "@base-ui/utils/useScrollLock";

const openCardSelector =
  '[data-sonner-toast][data-mounted="true"][data-visible="true"]:is([data-front="true"], [data-expanded="true"]):not([data-removed="true"]) .journal-notification[data-expanded="true"][data-phase="idle"]';

function scrollContainers(target: EventTarget | null, region: HTMLElement) {
  const result: HTMLElement[] = [];
  for (
    let node = target instanceof Element ? target : null;
    node && region.contains(node);
    node = node.parentElement
  ) {
    if (
      node instanceof HTMLElement &&
      /auto|scroll/.test(getComputedStyle(node).overflowY)
    )
      result.push(node);
  }
  return result;
}

function canScroll(containers: HTMLElement[], delta: number) {
  return containers.some((element) => {
    const remaining = element.scrollHeight - element.clientHeight;
    return (
      remaining > 1 &&
      (delta < 0 ? element.scrollTop > 0 : element.scrollTop < remaining - 1)
    );
  });
}

/** Share Base UI's reference-counted viewport lock with existing dialogs.
 * A gesture boundary also stops iOS pans on non-scrolling content and edges. */
export function useNotificationModal(
  region: RefObject<HTMLDivElement | null>,
  stackExpanded: boolean,
  outsideHeld: boolean,
) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const open = stackExpanded || detailsOpen || outsideHeld;
  useScrollLock(open);

  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return;
    const sync = () =>
      setDetailsOpen(Boolean(element.querySelector(openCardSelector)));
    const observer = new MutationObserver(sync);
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-expanded",
        "data-front",
        "data-phase",
        "data-mounted",
        "data-visible",
        "data-removed",
      ],
    });
    sync();
    return () => observer.disconnect();
  }, [region]);

  useLayoutEffect(() => {
    const element = region.current;
    if (!open || !element) return;
    let touch: { x: number; y: number; containers: HTMLElement[] } | undefined;
    const inside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const cards = element.querySelectorAll(openCardSelector);
      return cards.length
        ? Array.from(cards).some((card) => card.contains(target))
        : Boolean(
            element.querySelector("[data-sonner-toaster]")?.contains(target),
          );
    };
    const stop = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const touchStart = (event: TouchEvent) => {
      const point = event.touches[0];
      touch =
        point && inside(event.target)
          ? {
              x: point.clientX,
              y: point.clientY,
              containers: scrollContainers(event.target, element),
            }
          : undefined;
    };
    const touchMove = (event: TouchEvent) => {
      if (!inside(event.target)) return stop(event);
      if (event.touches.length !== 1) return;
      const point = event.touches[0];
      if (!touch) return stop(event);
      const x = touch.x - point.clientX;
      const y = touch.y - point.clientY;
      touch.x = point.clientX;
      touch.y = point.clientY;
      if (Math.abs(x) > Math.abs(y) || !canScroll(touch.containers, y))
        stop(event);
    };
    const wheel = (event: WheelEvent) => {
      if (
        !inside(event.target) ||
        !event.deltaY ||
        !canScroll(scrollContainers(event.target, element), event.deltaY)
      )
        stop(event);
    };
    const focusable = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter(
        (node) =>
          inside(node) &&
          !node.closest('[inert], [aria-hidden="true"]') &&
          node.getClientRects().length,
      );
    const focusInside = () => focusable()[0]?.focus({ preventScroll: true });
    const focus = (event: FocusEvent) => {
      if (!inside(event.target)) focusInside();
    };
    const tab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes.at(-1);
      if (
        !inside(document.activeElement) ||
        (event.shiftKey
          ? document.activeElement === first
          : document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    };
    if (!inside(document.activeElement)) focusInside();
    window.addEventListener("touchstart", touchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", touchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    window.addEventListener("focusin", focus, true);
    window.addEventListener("keydown", tab, true);
    return () => {
      window.removeEventListener("touchstart", touchStart, true);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("focusin", focus, true);
      window.removeEventListener("keydown", tab, true);
    };
  }, [open, region]);

  return open;
}
