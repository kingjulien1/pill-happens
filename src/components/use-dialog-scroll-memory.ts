"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  clampDialogScroll,
  createDialogScrollSession,
  type PublicDialogScrollKey,
} from "@/lib/dialog-scroll-memory";

/** Reuse pane positions only while this dialog remains open; every new visit starts at zero. */
export function useDialogScrollMemory<T extends HTMLElement>({
  open,
  sessionOpen = open,
  scrollKey,
  publicScrollKey,
  pane = "body",
  layout,
  restorePosition = true,
}: {
  open: boolean;
  /** Keep a writing dialog's source/preview panes in the same open session. */
  sessionOpen?: boolean;
  scrollKey?: string;
  publicScrollKey?: PublicDialogScrollKey;
  pane?: string;
  layout?: string | boolean;
  /** Explicit section navigation starts at zero before applying its own target. */
  restorePosition?: boolean;
}) {
  const elementRef = useRef<T | null>(null);
  const lastElementRef = useRef<T | null>(null);
  const [revision, setRevision] = useState(0);
  const memory = useRef(createDialogScrollSession());
  const capture = useRef<() => void>(() => {});
  const key = `${scrollKey ?? publicScrollKey ?? "local"}:${pane}`;

  useLayoutEffect(() => {
    memory.current.setOpen(sessionOpen);
  }, [sessionOpen]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!open || !sessionOpen || !element) return;
    // Reset after the outgoing effect has captured its last position, so a
    // replacement popup cannot accidentally restore that outgoing offset.
    if (element !== lastElementRef.current) {
      memory.current.reset();
      lastElementRef.current = element;
    }
    const initial = restorePosition
      ? memory.current.get(key)
      : { top: 0, left: 0 };
    let target = initial;
    let applied = target;
    let last = target;
    let touched = false;
    let disposed = false;
    let settled = false;
    let restoring = true;
    let frame = 0;
    let settleFrame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const position = () => ({
      top: element.scrollTop,
      left: element.scrollLeft,
    });
    const visible = () =>
      element.clientHeight > 0 && !element.closest("[hidden]");
    const persist = (sample = true) => {
      if (!settled) return;
      last = sample && visible() ? position() : last;
      memory.current.set(key, last);
    };
    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      persist();
    };
    const restore = () => {
      if (disposed || touched || !visible()) return;
      restoring = true;
      applied = clampDialogScroll(target, {
        height: element.scrollHeight - element.clientHeight,
        width: element.scrollWidth - element.clientWidth,
      });
      last = applied;
      element.scrollTop = applied.top;
      element.scrollLeft = applied.left;
      cancelAnimationFrame(settleFrame);
      settleFrame = requestAnimationFrame(() => {
        settled = true;
        restoring = false;
      });
    };
    const scheduleRestore = () => {
      if (disposed || touched) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const intent = () => {
      touched = true;
      settled = true;
      restoring = false;
      // Once the person takes control, layout/content changes must no longer
      // observe the editor or do any work attempting to restore its position.
      observer.disconnect();
      mutations.disconnect();
    };
    const scroll = () => {
      if (!visible() || restoring || !settled) return;
      last = position();
      if (last.top === applied.top && last.left === applied.left) return;
      intent();
      target = last;
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    };
    // Opening focus and delayed layout must not move a fresh dialog away from its top.
    restore();
    // Section shortcuts own any subsequent programmatic scroll, not this hook.
    frame = requestAnimationFrame(scheduleRestore);
    const observer = new ResizeObserver(scheduleRestore);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    const mutations = new MutationObserver(scheduleRestore);
    mutations.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    if (!restorePosition) intent();
    void document.fonts?.ready.then(scheduleRestore);
    element.addEventListener("scroll", scroll, { passive: true });
    element.addEventListener("wheel", intent, { passive: true });
    element.addEventListener("touchstart", intent, { passive: true });
    element.addEventListener("pointerdown", intent, { passive: true });
    element.addEventListener("keydown", intent);
    capture.current = flush;
    return () => {
      clearTimeout(timer);
      persist(false);
      disposed = true;
      capture.current = () => {};
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      observer.disconnect();
      mutations.disconnect();
      element.removeEventListener("scroll", scroll);
      element.removeEventListener("wheel", intent);
      element.removeEventListener("touchstart", intent);
      element.removeEventListener("pointerdown", intent);
      element.removeEventListener("keydown", intent);
    };
  }, [revision, key, layout, open, sessionOpen, restorePosition]);

  const setScrollElement = useCallback((node: T | null) => {
    elementRef.current = node;
    setRevision((previous) => previous + 1);
  }, []);
  const save = useCallback(() => capture.current(), []);
  return { setScrollElement, save };
}
