"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CONFIRMATION_PAUSE_MS,
  RESET_EXIT_MS,
  useDialogSweepFrame,
} from "./use-dialog-sweep-frame";
import { BrushCleaning, Check } from "lucide-react";
import styles from "./dialog-reset-sweep.module.css";

type Phase = "waiting" | "settling" | "sweeping" | null;
export const DialogResetSweep = createContext<{
  begin: (reset: () => void) => void;
  reveal: () => void;
} | null>(null);

export function useDialogResetSweep() {
  const [phase, setPhase] = useState<Phase>(null);
  const pending = useRef<(() => void) | null>(null);
  const commit = useCallback(() => {
    const reset = pending.current;
    pending.current = null;
    reset?.();
  }, []);
  const controls = useMemo(
    () => ({
      begin(reset: () => void) {
        pending.current = reset;
        setPhase("waiting");
      },
      reveal() {
        setPhase((current) => (current === "waiting" ? "settling" : current));
      },
    }),
    [],
  );
  // A confirmed reset still applies if the editor closes or the PWA is suspended.
  useEffect(() => () => commit(), [commit]);
  useEffect(() => {
    if (!phase) return;
    window.addEventListener("pagehide", commit);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The exit callback usually starts the sweep. Resizing can replace that sheet.
    const revealTimer =
      phase === "waiting" ? setTimeout(controls.reveal, 950) : undefined;
    const pauseTimer =
      phase === "settling"
        ? setTimeout(
            () => setPhase("sweeping"),
            reduced ? 0 : CONFIRMATION_PAUSE_MS,
          )
        : undefined;
    const cleanTimer =
      phase === "sweeping" ? setTimeout(commit, reduced ? 0 : 1180) : undefined;
    const finishTimer =
      phase === "sweeping"
        ? setTimeout(
            () => {
              commit();
              setPhase(null);
            },
            reduced ? 220 : RESET_EXIT_MS,
          )
        : undefined;
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(pauseTimer);
      clearTimeout(cleanTimer);
      clearTimeout(finishTimer);
      window.removeEventListener("pagehide", commit);
    };
  }, [phase, commit, controls]);
  return { phase, controls };
}

export function DialogSweepVeil({ phase }: { phase: Exclude<Phase, null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = phase === "sweeping";
  const frame = useDialogSweepFrame(ref, active, "down");
  useLayoutEffect(() => {
    const marker = ref.current;
    const surface = marker?.closest<HTMLElement>("[data-dialog-surface]");
    if (!active || !marker || !surface) return;
    marker.focus({ preventScroll: true });
    return () => {
      requestAnimationFrame(() => {
        if (!surface.isConnected || surface.hasAttribute("data-reset-phase"))
          return;
        const target =
          surface.querySelector<HTMLElement>("[data-reset-tool]:enabled") ??
          surface.querySelector<HTMLElement>(
            "[data-intake-submit], [data-check-in-submit] button[type=submit]",
          ) ??
          surface.querySelector<HTMLElement>("[data-modal-close]");
        target?.focus({ preventScroll: true });
      });
    };
  }, [active]);
  return (
    <>
      <div ref={ref} tabIndex={-1} className="sr-only" role="status">
        {active ? "Resetting draft" : ""}
      </div>
      {active &&
        frame &&
        createPortal(
          <div
            className={styles.veil}
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
            }}
            data-sweep="sweeping"
            aria-hidden="true"
          >
            <div className={styles.pass}>
              <span className={styles.bristles} />
              <BrushCleaning />
              <i />
              <i />
              <i />
            </div>
            <span className={styles.seal}>
              <Check size={17} /> Draft reset
              <i className={styles.imprint} />
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
