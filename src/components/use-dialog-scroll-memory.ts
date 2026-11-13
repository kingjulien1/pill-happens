"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { useOptionalJournalWorkspace } from "@/components/journal-drafts";
import { dialogScrollKey } from "@/lib/journal-drafts";
import {
  clampDialogScroll,
  createPublicDialogScrollMemory,
  type DialogScrollPosition,
  type PublicDialogScrollKey,
} from "@/lib/dialog-scroll-memory";

const noopSubscribe = () => () => {};
const zero = { top: 0, left: 0 };

/** One scroller, shared across popup/drawer layouts; no form contents are copied. */
export function useDialogScrollMemory<T extends HTMLElement>({
  open,
  scrollKey,
  publicScrollKey,
  pane = "body",
  layout,
  restorePosition = true,
}: {
  open: boolean;
  scrollKey?: string;
  publicScrollKey?: PublicDialogScrollKey;
  pane?: string;
  layout?: string | boolean;
  /** False for explicit section navigation; subsequent scrolling still persists. */
  restorePosition?: boolean;
}) {
  const workspace = useOptionalJournalWorkspace();
  const store = workspace?.store;
  const pathname = usePathname();
  // Subscribe only to readiness. Quiet scroll writes never rerender the tree.
  const hydrated = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    () => store?.getSnapshot().hydrated ?? true,
    () => false,
  );
  const elementRef = useRef<T | null>(null);
  const [revision, setRevision] = useState(0);
  const fallback = useMemo(
    () => ({ store, positions: new Map<string, DialogScrollPosition>() }),
    [store],
  );
  const publicMemory = useRef<ReturnType<
    typeof createPublicDialogScrollMemory
  > | null>(null);
  const capture = useRef<() => void>(() => {});
  const key = `${pathname}|${scrollKey ?? "local"}:${pane}`;
  const journalKey = scrollKey
    ? dialogScrollKey(pathname, `${scrollKey}:${pane}`)
    : null;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!open || !element || !hydrated) return;
    if (publicScrollKey && !publicMemory.current) {
      let storage: Storage | null = null;
      try {
        storage = window.localStorage;
      } catch {
        /* Memory remains usable. */
      }
      publicMemory.current = createPublicDialogScrollMemory(storage);
    }
    const rememberedPosition =
      (store && journalKey
        ? store.getSnapshot().scrollViews[journalKey]
        : publicScrollKey
          ? publicMemory.current?.get(pathname, publicScrollKey)
          : undefined) ??
      fallback.positions.get(key) ??
      zero;
    const initial = restorePosition ? rememberedPosition : zero;
    let target = { top: initial.top, left: initial.left };
    let applied = target;
    let last = target;
    let touched = !restorePosition;
    let disposed = false;
    let settled = !restorePosition;
    let restoring = restorePosition;
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
      const next = sample && visible() ? position() : last;
      last = next;
      fallback.positions.set(key, next);
      if (store && journalKey) store.setDialogScroll(journalKey, next);
      else if (publicScrollKey)
        publicMemory.current?.set(pathname, publicScrollKey, next);
    };
    const flush = () => {
      clearTimeout(timer);
      timer = undefined;
      persist();
    };
    const leave = () => {
      clearTimeout(timer);
      timer = undefined;
      // Safari can reset the outgoing DOM scroller before beforeunload/pagehide.
      // Its last live scroll event is authoritative during document navigation.
      persist(false);
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
    };
    const scroll = () => {
      if (!visible() || restoring || !settled) return;
      const next = position();
      last = next;
      if (next.top === applied.top && next.left === applied.left) return;
      // A changed caret/focus position after opening is part of normal editing.
      touched = true;
      target = next;
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    };
    const hidden = () => {
      if (document.hidden) leave();
    };
    // Restore immediately, then after Base UI autofocus and the opening layout.
    restore();
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
    void document.fonts?.ready.then(scheduleRestore);
    element.addEventListener("scroll", scroll, { passive: true });
    element.addEventListener("wheel", intent, { passive: true });
    element.addEventListener("touchstart", intent, { passive: true });
    element.addEventListener("pointerdown", intent, { passive: true });
    element.addEventListener("keydown", intent);
    window.addEventListener("pagehide", leave);
    window.addEventListener("beforeunload", leave);
    document.addEventListener("visibilitychange", hidden);
    capture.current = flush;
    return () => {
      clearTimeout(timer);
      // The form may already have unmounted, collapsing the still-visible popup.
      // Retain its last live coordinates instead of writing the closing zero.
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
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [
    revision,
    fallback,
    hydrated,
    journalKey,
    key,
    layout,
    open,
    pathname,
    publicScrollKey,
    restorePosition,
    store,
  ]);

  const setScrollElement = useCallback((node: T | null) => {
    elementRef.current = node;
    setRevision((previous) => previous + 1);
  }, []);
  const save = useCallback(() => capture.current(), []);
  return { setScrollElement, save };
}
