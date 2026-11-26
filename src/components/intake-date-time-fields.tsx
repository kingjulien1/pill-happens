"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { RotateCcw } from "lucide-react";
import { lunarStarPath, lunarSparkPath } from "./lunar-star-paths";
import { useTimeLockPress } from "./use-time-lock-press";
import { Input, inputSurface } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

type Phase =
  "idle" | "waiting" | "entering" | "settling" | "resetting" | "refreshing";
type IntakeDateTimeFieldsProps = {
  value: string;
  onChange: (combined: string) => void;
  onReset: () => void;
  onFix: () => void;
  onEditingChange?: (focused: boolean) => void;
  onResettingChange?: (resetting: boolean) => void;
  pinned: boolean;
  timezone: string;
  disabled?: boolean;
};

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pin immediately; celebrate only after leaving the native date/time controls. */
export function IntakeDateTimeFields({
  value,
  onChange,
  onReset,
  onFix,
  onEditingChange,
  onResettingChange,
  pinned,
  timezone,
  disabled = false,
}: IntakeDateTimeFieldsProps) {
  const id = useId();
  const separator = value.indexOf("T");
  const date = separator < 0 ? value : value.slice(0, separator);
  const time = separator < 0 ? "" : value.slice(separator + 1);
  const localNow = toLocalInput(new Date(), timezone);
  const [phase, setPhase] = useState<Phase>("idle");
  const [motionKey, setMotionKey] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edited = useRef(false);
  const resetting = useRef(false);
  const callbacks = useRef({ onReset, onResettingChange });
  useEffect(() => {
    callbacks.current = { onReset, onResettingChange };
  }, [onReset, onResettingChange]);

  const finishReset = useCallback(() => {
    if (!resetting.current) return;
    resetting.current = false;
    callbacks.current.onReset();
    callbacks.current.onResettingChange?.(false);
  }, []);
  useEffect(() => {
    const leave = () => {
      if (!resetting.current) return;
      finishReset();
      setPhase("idle");
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      if (commitTimer.current !== null) clearTimeout(commitTimer.current);
      finishReset();
    };
  }, [finishReset]);
  const locked = disabled || phase === "resetting" || phase === "refreshing";

  const cancelCommit = () => {
    if (commitTimer.current !== null) clearTimeout(commitTimer.current);
    commitTimer.current = null;
  };
  const focusInput = () => {
    cancelCommit();
    onEditingChange?.(true);
  };
  const commitInput = () => {
    onEditingChange?.(false);
    cancelCommit();
    if (!edited.current || locked) return;
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      edited.current = false;
      setMotionKey((key) => key + 1);
      setPhase(reducedMotion() ? "idle" : "entering");
    }, 180);
  };
  const changeInput = (combined: string) => {
    if (combined === value || locked) return;
    edited.current = true;
    if (!pinned) setPhase("waiting");
    onChange(combined);
  };
  const resetTiming = () => {
    if (locked || resetting.current) return;
    cancelCommit();
    edited.current = false;
    resetting.current = true;
    onResettingChange?.(true);
    if (reducedMotion()) {
      finishReset();
      setPhase("idle");
    } else setPhase(pinned ? "resetting" : "refreshing");
  };
  const fixTiming = () => {
    cancelCommit();
    edited.current = false;
    onFix();
    setPhase(reducedMotion() ? "idle" : "settling");
  };
  const hold = useTimeLockPress(locked, resetTiming, fixTiming);
  const state =
    hold.stage ??
    (phase === "resetting" || phase === "refreshing"
      ? phase
      : pinned
        ? phase === "idle"
          ? "fixed"
          : phase
        : "idle");

  // Give finite transitions a deadline even if motion is interrupted or the
  // OS changes its motion preference before an animationend could fire.
  useEffect(() => {
    const durations = {
      entering: 1020,
      settling: 420,
      resetting: 540,
      refreshing: 460,
    };
    if (phase === "idle" || phase === "waiting") return;
    const timer = setTimeout(() => {
      finishReset();
      setPhase("idle");
    }, durations[phase]);
    return () => clearTimeout(timer);
  }, [phase, motionKey, finishReset]);

  useEffect(() => {
    const node = button.current;
    if (!node || (state !== "fixed" && state !== "ready")) return;
    let visible = false;
    const sync = () => {
      node.dataset.playing = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      delete node.dataset.playing;
    };
  }, [state]);

  const hint =
    hold.stage === "ready"
      ? pinned
        ? "Release to lock the current time."
        : "Release to lock this date and time."
      : hold.stage === "charging"
        ? "Keep holding to lock. Release early to cancel."
        : pinned
          ? "Tap to unlock · Hold 2s to lock a new time"
          : "Tap for now · Hold 2s to lock this time";

  return (
    <div
      className={styles.fields}
      data-intake-date-time-fields
      data-timing-pinned={pinned}
    >
      <div className={styles.field}>
        <Label htmlFor={`${id}-date`}>Date Taken</Label>
        <Input
          id={`${id}-date`}
          name="takenAtDate"
          type="date"
          value={date}
          max={localNow.slice(0, 10)}
          onChange={(event) => {
            changeInput(`${event.target.value}T${time}`);
            // Native pickers can commit without moving focus away from the field.
            if (event.nativeEvent.type === "change") commitInput();
          }}
          onFocus={focusInput}
          onBlur={commitInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          disabled={locked}
          required
          className={`${styles.input} ${styles.dateInput}`}
          data-intake-date
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor={`${id}-time`}>Time Taken</Label>
        <Input
          id={`${id}-time`}
          name="takenAtTime"
          type="time"
          value={time}
          max={date === localNow.slice(0, 10) ? localNow.slice(11) : undefined}
          step={60}
          onChange={(event) => {
            changeInput(`${date}T${event.target.value}`);
            if (event.nativeEvent.type === "change") commitInput();
          }}
          onFocus={focusInput}
          onBlur={commitInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          disabled={locked}
          required
          className={`${styles.input} ${styles.timeInput}`}
          data-intake-clock
        />
      </div>
      <div className={styles.field}>
        <Label htmlFor={`${id}-lock`}>Time Lock</Label>
        <button
          ref={button}
          id={`${id}-lock`}
          type="button"
          className={`${inputSurface} ${styles.input} ${styles.resetButton}`}
          {...hold.handlers}
          disabled={locked}
          aria-pressed={pinned}
          aria-describedby={`${id}-timing-status`}
          title={hint}
          data-intake-time-reset
          data-state={state}
          data-clock-face={
            (state !== "idle" &&
              state !== "waiting" &&
              state !== "refreshing") ||
            undefined
          }
          data-fixed-start={(pinned && hold.stage) || undefined}
          style={
            { "--charge-duration": `${hold.chargeDuration}ms` } as CSSProperties
          }
        >
          <span className={styles.face} aria-hidden="true">
            <span className={styles.wash} />
            <svg
              className={styles.rim}
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              <rect
                x="2"
                y="2"
                width="96"
                height="36"
                rx="10"
                pathLength="100"
              />
            </svg>
            <span key={motionKey} className={styles.glyph}>
              <RotateCcw
                className={styles.refresh}
                size={20}
                strokeWidth={2.15}
              />
              <svg
                className={styles.clock}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  className={styles.dial}
                  pathLength="1"
                  d="M12.337 21.994a10 10 0 1 1 9.588-8.767"
                />
                <path className={styles.hands} d="M12 6v6l2 1" />
                <g className={styles.arrow}>
                  <path className={styles.stem} d="M12 5v14" />
                  <path className={styles.head} d="m5 12 7 7 7-7" />
                </g>
              </svg>
            </span>
            {["near", "far"].map((position) => (
              <svg
                key={position}
                className={styles.star}
                data-star={position}
                viewBox="-8 -8 16 16"
              >
                <path d={lunarStarPath} fill="currentColor" />
                <path
                  className={styles.sparks}
                  d={lunarSparkPath}
                  fill="none"
                  stroke="currentColor"
                />
              </svg>
            ))}
          </span>
        </button>
      </div>
      <span
        className={styles.hint}
        id={`${id}-timing-status`}
        role="status"
        aria-atomic="true"
      >
        {hint}
      </span>
    </div>
  );
}
