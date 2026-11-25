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
import { BrushCleaning, Check } from "lucide-react";
import styles from "./dialog-reset-sweep.module.css";

type Phase = "waiting" | "sweeping" | null;
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
        setPhase((current) => (current === "waiting" ? "sweeping" : current));
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
    const cleanTimer =
      phase === "sweeping" ? setTimeout(commit, reduced ? 0 : 560) : undefined;
    const finishTimer =
      phase === "sweeping"
        ? setTimeout(
            () => {
              commit();
              setPhase(null);
            },
            reduced ? 220 : 1450,
          )
        : undefined;
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(cleanTimer);
      clearTimeout(finishTimer);
      window.removeEventListener("pagehide", commit);
    };
  }, [phase, commit, controls]);
  return { phase, controls };
}

export function DialogSweepVeil({ phase }: { phase: Exclude<Phase, null> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const veil = ref.current;
    const surface = veil?.closest<HTMLElement>("[data-dialog-surface]");
    if (!veil || !surface) return;
    const place = () => {
      veil.style.top = surface.scrollTop + "px";
      veil.style.height = surface.clientHeight + "px";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(surface);
    surface.addEventListener("scroll", place, { passive: true });
    if (phase === "sweeping") veil.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      surface.removeEventListener("scroll", place);
      if (phase === "sweeping")
        requestAnimationFrame(() => {
          if (
            surface.isConnected &&
            !surface.hasAttribute("data-reset-phase")
          ) {
            const target =
              surface.querySelector<HTMLElement>("[data-reset-tool]:enabled") ??
              surface.querySelector<HTMLElement>(
                "[data-intake-submit], [data-check-in-submit] button[type=submit]",
              ) ??
              surface.querySelector<HTMLElement>("[data-modal-close]");
            target?.focus({ preventScroll: true });
          }
        });
    };
  }, [phase]);
  return (
    <div
      className={styles.veil}
      ref={ref}
      data-sweep={phase}
      tabIndex={-1}
      data-base-ui-swipe-ignore=""
      role="status"
    >
      <div className={styles.pass} aria-hidden="true">
        <span className={styles.bristles} />
        <BrushCleaning />
        <i />
        <i />
        <i />
      </div>
      <span className={styles.seal}>
        <Check aria-hidden="true" size={17} /> Draft reset
      </span>
    </div>
  );
}
