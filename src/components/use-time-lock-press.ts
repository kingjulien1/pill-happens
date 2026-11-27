"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const chargeDelay = 300;
const readyAfter = 1350;
type PressSource = number | " " | "Enter";

/** Keep the native click for taps and assistive technology. A hold commits only on release. */
export function useTimeLockPress(
  disabled: boolean,
  tap: () => void,
  fix: () => void,
) {
  const [stage, setStage] = useState<"charging" | "ready" | null>(null);
  const press = useRef<{
    source: PressSource;
    started: number;
    x: number;
    y: number;
    chargeTimer: ReturnType<typeof setTimeout>;
    readyTimer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const swallowClick = useRef(false);

  const clear = useCallback(() => {
    if (!press.current) return;
    clearTimeout(press.current.chargeTimer);
    clearTimeout(press.current.readyTimer);
    press.current = null;
    setStage(null);
  }, []);
  const cancel = useCallback(() => {
    if (!press.current) return;
    swallowClick.current = true;
    clear();
  }, [clear]);

  useEffect(() => {
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("pagehide", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pagehide", cancel);
      document.removeEventListener("visibilitychange", visibility);
      clear();
    };
  }, [cancel, clear]);
  useEffect(() => {
    if (disabled) cancel();
  }, [cancel, disabled]);

  function begin(source: PressSource, x = 0, y = 0) {
    if (disabled || press.current) return;
    swallowClick.current = false;
    press.current = {
      source,
      started: performance.now(),
      x,
      y,
      chargeTimer: setTimeout(() => setStage("charging"), chargeDelay),
      readyTimer: setTimeout(() => setStage("ready"), readyAfter),
    };
  }
  function release(source: PressSource) {
    if (press.current?.source !== source) return;
    const elapsed = performance.now() - press.current.started;
    clear();
    if (disabled) return;
    if (elapsed >= chargeDelay) {
      swallowClick.current = true;
      if (elapsed >= readyAfter) fix();
    } else if (typeof source === "string") {
      tap();
    }
  }
  function moved(event: PointerEvent<HTMLButtonElement>) {
    const held = press.current;
    return (
      held?.source === event.pointerId &&
      Math.hypot(event.clientX - held.x, event.clientY - held.y) > 12
    );
  }
  return {
    stage,
    chargeDuration: readyAfter - chargeDelay,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!event.isPrimary || event.button !== 0 || press.current || disabled)
          return;
        begin(event.pointerId, event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        if (moved(event)) cancel();
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        if (moved(event)) cancel();
        else release(event.pointerId);
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
