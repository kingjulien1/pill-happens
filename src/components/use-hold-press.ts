"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const releaseDuration = 1200;
type PressSource = number | " " | "Enter";
export type HoldFeedback = "charging" | "ready" | "released" | "canceled";
type DownwardPull = {
  distance: number;
  onProgress: (progress: number | null) => void;
};

/** Keep the native click for taps and assistive technology. A hold commits only on release. */
export function useHoldPress(
  disabled: boolean,
  tap: () => void,
  confirm: () => void,
  {
    delay,
    duration,
    tapWindow = delay,
    downwardPull,
  }: {
    delay: number;
    duration: number;
    tapWindow?: number;
    downwardPull?: DownwardPull;
  },
) {
  const [feedback, setFeedback] = useState<HoldFeedback | null>(null);
  const press = useRef<{
    source: PressSource;
    started: number;
    x: number;
    y: number;
    pull?: DownwardPull;
    progress: number | null;
    ready: boolean;
    chargeTimer: ReturnType<typeof setTimeout>;
    readyTimer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const swallowClick = useRef(false);
  const listeners = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    listeners.current?.abort();
    listeners.current = null;
    if (!press.current) return;
    clearTimeout(press.current.chargeTimer);
    clearTimeout(press.current.readyTimer);
    if (press.current.progress !== null) press.current.pull?.onProgress(null);
    press.current = null;
    setFeedback(null);
  }, []);
  const cancel = useCallback(() => {
    if (!press.current) return;
    const visibleHold =
      press.current.progress !== null ||
      performance.now() - press.current.started >= delay;
    swallowClick.current = true;
    clear();
    if (visibleHold && !document.hidden) setFeedback("canceled");
  }, [clear, delay]);

  useEffect(() => clear, [clear]);
  useEffect(() => {
    if (disabled) cancel();
  }, [cancel, disabled]);
  useEffect(() => {
    if (feedback !== "released" && feedback !== "canceled") return;
    const timer = setTimeout(
      () => setFeedback(null),
      feedback === "released" ? releaseDuration : 180,
    );
    return () => clearTimeout(timer);
  }, [feedback]);

  function markReady() {
    const held = press.current;
    if (!held || held.ready) return;
    held.ready = true;
    clearTimeout(held.chargeTimer);
    clearTimeout(held.readyTimer);
    setFeedback("ready");
  }
  function begin(source: PressSource, x = 0, y = 0) {
    if (disabled || press.current) return;
    swallowClick.current = false;
    const controller = new AbortController();
    listeners.current = controller;
    const options = { signal: controller.signal };
    window.addEventListener("blur", cancel, options);
    window.addEventListener("pagehide", cancel, options);
    if (typeof source === "number") {
      document.addEventListener("wheel", cancel, {
        ...options,
        capture: true,
        passive: true,
      });
    }
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) cancel();
      },
      options,
    );
    setFeedback(null);
    press.current = {
      source,
      started: performance.now(),
      x,
      y,
      pull: typeof source === "number" ? downwardPull : undefined,
      progress: null,
      ready: false,
      chargeTimer: setTimeout(() => setFeedback("charging"), delay),
      readyTimer: setTimeout(markReady, duration),
    };
  }
  function release(source: PressSource) {
    const held = press.current;
    if (held?.source !== source) return;
    const elapsed = performance.now() - held.started;
    clear();
    if (disabled) return;
    if (held.progress !== null || elapsed >= tapWindow) {
      swallowClick.current = true;
      if (held.ready || elapsed >= duration) {
        confirm();
        setFeedback("released");
      } else setFeedback("canceled");
    } else if (typeof source === "string") {
      tap();
    }
  }
  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    const held = press.current;
    if (held?.source !== event.pointerId || held.progress === 1) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (!held.pull) {
      if (Math.hypot(dx, dy) > 12) cancel();
      return;
    }
    if (dy < -12 || Math.abs(dx) > Math.max(12, dy * 0.75)) {
      cancel();
      return;
    }
    // Keep ordinary tap jitter out of the drag. Once started, a short pull
    // can return to the origin but releasing it can never become a tap.
    const slop = 6;
    if (held.progress === null && dy <= slop) return;
    const progress = Math.max(
      0,
      Math.min(1, (dy - slop) / (held.pull.distance - slop)),
    );
    if (progress === held.progress) return;
    held.progress = progress;
    held.pull.onProgress(progress);
    if (progress === 1) markReady();
  }
  return {
    feedback,
    stage: feedback === "charging" || feedback === "ready" ? feedback : null,
    chargeDuration: duration - delay,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!event.isPrimary || event.button !== 0 || press.current || disabled)
          return;
        begin(event.pointerId, event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: trackPointer,
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        trackPointer(event);
        release(event.pointerId);
      },
      onPointerCancel(event: PointerEvent<HTMLButtonElement>) {
        if (press.current?.source === event.pointerId) cancel();
      },
      onLostPointerCapture(event: PointerEvent<HTMLButtonElement>) {
        if (press.current?.source === event.pointerId) cancel();
      },
      onContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
      },
      onBlur() {
        // Safari moves focus to the drawer on pointer-down, even while the
        // button owns pointer capture. Only keyboard holds rely on focus.
        if (typeof press.current?.source === "string") cancel();
      },
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape" && press.current) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (!event.repeat) begin(event.key);
      },
      onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        release(event.key);
      },
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (swallowClick.current && event.detail > 0) {
          swallowClick.current = false;
          return;
        }
        if (!disabled && !press.current) tap();
      },
    },
  };
}
