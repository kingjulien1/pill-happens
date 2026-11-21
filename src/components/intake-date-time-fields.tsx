"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pin, RotateCcw, Sparkle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

type Phase =
  "idle" | "waiting" | "entering" | "holding" | "resetting" | "refreshing";
type IntakeDateTimeFieldsProps = {
  value: string;
  onChange: (combined: string) => void;
  onReset: () => void;
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
  const [phase, setPhase] = useState<Phase>(pinned ? "holding" : "idle");
  const [motionKey, setMotionKey] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edited = useRef(false);
  const resetting = useRef(false);
  const callbacks = useRef({ onReset, onEditingChange, onResettingChange });
  useEffect(() => {
    callbacks.current = { onReset, onEditingChange, onResettingChange };
  }, [onReset, onEditingChange, onResettingChange]);
  useEffect(
    () => () => {
      if (commitTimer.current !== null) clearTimeout(commitTimer.current);
      // A close during the outro must still honor an explicitly requested reset.
      if (resetting.current) callbacks.current.onReset();
      callbacks.current.onResettingChange?.(false);
    },
    [],
  );
  useEffect(() => {
    const leave = () => {
      if (!resetting.current) return;
      resetting.current = false;
      callbacks.current.onReset();
      callbacks.current.onResettingChange?.(false);
      setPhase("idle");
      setConfirmed(true);
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (!media.matches) return;
      if (resetting.current) {
        resetting.current = false;
        callbacks.current.onReset();
        callbacks.current.onResettingChange?.(false);
        setConfirmed(true);
        setPhase("idle");
      } else
        setPhase((current) => (current === "entering" ? "holding" : current));
    };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);

  const state =
    phase === "resetting" || phase === "refreshing" || phase === "entering"
      ? phase
      : pinned
        ? phase === "waiting"
          ? "waiting"
          : "holding"
        : "idle";
  const active = state === "holding" || state === "entering";
  const locked = disabled || phase === "resetting" || phase === "refreshing";

  // Three tiny WAAPI accents per burst. No animation frames or permanent timers;
  // pause both scheduling and ambient motion when offscreen or backgrounded.
  useEffect(() => {
    const node = button.current;
    if (!node || state !== "holding" || reducedMotion()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inView = true;
    let animations: Animation[] = [];
    const stop = () => {
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    const schedule = () => {
      stop();
      const playing = inView && !document.hidden && !reducedMotion();
      node.dataset.motionPaused = String(!playing);
      if (!playing) return;
      timer = setTimeout(
        () => {
          const sparks = node.querySelectorAll<SVGElement>(
            "[data-timing-spark]",
          );
          animations = [...sparks].map((spark, index) =>
            spark.animate(
              [
                {
                  opacity: 0,
                  transform: "translateY(2px) scale(.15) rotate(-35deg)",
                },
                {
                  opacity: 0.95,
                  transform: "translateY(-1px) scale(1) rotate(5deg)",
                  offset: 0.45,
                },
                {
                  opacity: 0.8,
                  transform: "translateY(-2px) scale(.85) rotate(12deg)",
                  offset: 0.7,
                },
                {
                  opacity: 0,
                  transform: "translateY(-6px) scale(1.65) rotate(28deg)",
                },
              ],
              {
                duration: 560,
                delay: index * 70,
                easing: "cubic-bezier(.2,.8,.25,1)",
              },
            ),
          );
          // Start the next quiet interval after this burst has finished.
          timer = setTimeout(schedule, 700);
        },
        2000 + Math.random() * 3000,
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", schedule);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changedPreference = () => {
      if (preference.matches) {
        stop();
        node.dataset.motionPaused = "true";
      } else schedule();
    };
    preference.addEventListener("change", changedPreference);
    schedule();
    return () => {
      stop();
      observer.disconnect();
      preference.removeEventListener("change", changedPreference);
      document.removeEventListener("visibilitychange", schedule);
      delete node.dataset.motionPaused;
    };
  }, [state]);

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
      setPhase(reducedMotion() ? "holding" : "entering");
    }, 180);
  };
  const changeInput = (combined: string) => {
    if (combined === value || locked) return;
    edited.current = true;
    setConfirmed(false);
    if (!pinned) setPhase("waiting");
    onChange(combined);
  };
  const finishReset = () => {
    if (!resetting.current) return;
    resetting.current = false;
    onReset();
    onResettingChange?.(false);
    setConfirmed(true);
    setPhase("idle");
  };
  const resetTiming = () => {
    if (locked || resetting.current) return;
    cancelCommit();
    edited.current = false;
    resetting.current = true;
    onResettingChange?.(true);
    setMotionKey((key) => key + 1);
    if (reducedMotion()) finishReset();
    else setPhase(pinned ? "resetting" : "refreshing");
  };
  const resetLabel = pinned
    ? "Unpin timing and reset date and time to now"
    : "Refresh date and time to now";

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
        <div className={styles.timeControls}>
          <Input
            id={`${id}-time`}
            name="takenAtTime"
            type="time"
            value={time}
            max={
              date === localNow.slice(0, 10) ? localNow.slice(11) : undefined
            }
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
          <Button
            ref={button}
            type="button"
            variant="outline"
            size="icon"
            onClick={resetTiming}
            disabled={locked}
            aria-label={resetLabel}
            aria-describedby={`${id}-timing-status`}
            title={resetLabel}
            className={styles.resetButton}
            data-dialog-corner="control"
            data-intake-time-reset
            data-state={state}
            data-pinned={active || undefined}
          >
            <span className={styles.wash} aria-hidden="true" />
            <svg
              className={`${styles.edgeShine} size-full`}
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="98"
                height="38"
                rx="11"
                pathLength="100"
              />
            </svg>
            <span
              key={motionKey}
              className={styles.glyphMotion}
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (phase === "resetting" || phase === "refreshing")
                  finishReset();
                else if (phase === "entering") setPhase("holding");
              }}
              aria-hidden="true"
            >
              <span className={styles.ambient}>
                <RotateCcw
                  className={`${styles.idleGlyph} size-[18px]`}
                  size={18}
                  strokeWidth={2.2}
                />
                <Pin
                  className={`${styles.pinGlyph} size-[18px]`}
                  size={18}
                  strokeWidth={2.2}
                />
              </span>
            </span>
            <svg
              className={`${styles.burst} size-full`}
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="32" cy="32" r="18" />
              {Array.from({ length: 8 }, (_, index) => (
                <path
                  key={index}
                  d="M32 6v5"
                  transform={`rotate(${index * 45} 32 32)`}
                />
              ))}
            </svg>
            <Sparkle
              className={`${styles.sparkle} size-[9px]`}
              data-spark-position="first"
              data-timing-spark
              size={9}
              aria-hidden="true"
            />
            <Star
              className={`${styles.sparkle} size-[7px]`}
              data-spark-position="second"
              data-timing-spark
              size={7}
              aria-hidden="true"
            />
            <Sparkle
              className={`${styles.sparkle} size-[6px]`}
              data-spark-position="third"
              data-timing-spark
              size={6}
              aria-hidden="true"
            />
            <span className={styles.pinDot} aria-hidden="true" />
          </Button>
        </div>
        <span
          id={`${id}-timing-status`}
          role="status"
          aria-atomic="true"
          className="sr-only"
        >
          {pinned
            ? "Date and time are pinned across new and edit intake dialogs, even after saving. Reset here to release them."
            : confirmed
              ? "Timing reset to now. Current time follows the app’s minute clock."
              : "Manual date or time changes stay pinned until you reset them here."}
        </span>
      </div>
    </div>
  );
}
