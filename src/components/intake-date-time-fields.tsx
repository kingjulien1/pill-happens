"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CalendarClock,
  ClockCheck,
  Hourglass,
  Info,
  KeyRound,
  LockKeyhole,
  LockKeyholeOpen,
  Stamp,
  Timer,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { TIME_LOCK_HOLD_MS, useTimeLockPress } from "./use-time-lock-press";
import { TimeLockCountdown } from "./time-lock-countdown";
import feedbackStyles from "./time-lock-countdown.module.css";
import { CheckInSection } from "./check-in-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

type Phase =
  "idle" | "waiting" | "entering" | "settling" | "resetting" | "refreshing";
const timeLockIcons = Object.entries({
  idle: Timer,
  waiting: CalendarClock,
  charging: Hourglass,
  ready: ClockCheck,
  entering: KeyRound,
  settling: Stamp,
  fixed: LockKeyhole,
  resetting: LockKeyholeOpen,
  refreshing: TimerReset,
} satisfies Record<Phase | "charging" | "ready" | "fixed", LucideIcon>);
type IntakeTimingSectionProps = {
  headingId: string;
  context: ReactNode;
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

const revealDuration = 580;
const manualEntryDuration = 700;
const unlockDuration = 820;
const refreshDuration = 460;
const noticeHeadings = {
  idle: ["Time unlocked", "Tap for now"],
  fixed: ["Time locked", "Tap to unlock"],
  charging: ["Keep holding", "Release to cancel"],
  ready: ["Ready to lock", "Release to lock"],
  resetting: ["Unlocking time", "Returning to now"],
  refreshing: ["Refreshing time", "Returning to now"],
} as const;

/** Pin immediately; celebrate only after leaving the native date/time controls. */
export function IntakeTimingSection({
  headingId,
  context,
  value,
  onChange,
  onReset,
  onFix,
  onEditingChange,
  onResettingChange,
  pinned,
  timezone,
  disabled = false,
}: IntakeTimingSectionProps) {
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
  const { chargeDuration } = hold;
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
      entering: manualEntryDuration,
      settling: revealDuration,
      resetting: unlockDuration,
      refreshing: refreshDuration,
    };
    if (phase === "idle" || phase === "waiting") return;
    const timer = setTimeout(() => {
      finishReset();
      setPhase(phase === "entering" && !reducedMotion() ? "settling" : "idle");
    }, durations[phase]);
    return () => clearTimeout(timer);
  }, [phase, motionKey, finishReset]);

  useEffect(() => {
    const node = button.current;
    if (!node) return;
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
  }, []);

  const [status, action] =
    noticeHeadings[
      hold.stage ??
        (phase === "resetting" || phase === "refreshing"
          ? phase
          : pinned
            ? "fixed"
            : "idle")
    ];
  const instructions =
    phase === "resetting"
      ? "The date and time return to now together. Your saved intakes keep their original timestamps."
      : pinned
        ? "New and edited intakes share this time. Both fields stay editable. Hold again to lock the current time."
        : `Hold Time Lock for ${TIME_LOCK_HOLD_MS / 1000} seconds. Release when the ring fills to keep both values. Editing either field also locks them.`;

  return (
    <CheckInSection
      caption="Timing"
      headingId={headingId}
      context={context}
      action={
        <>
          <Button
            ref={button}
            type="button"
            variant="outline"
            size="icon"
            className={`${styles.resetButton} ${feedbackStyles.trigger}`}
            aria-label="Time Lock"
            title={
              pinned
                ? "Tap to unlock · Hold to lock the current time"
                : "Tap for now · Hold to lock the time"
            }
            {...hold.handlers}
            disabled={locked}
            aria-pressed={pinned}
            aria-describedby={`${id}-timing-status ${id}-timing-help`}
            data-intake-time-reset
            data-state={state}
            data-feedback={hold.feedback ?? undefined}
            style={
              {
                "--charge-duration": `${chargeDuration}ms`,
                "--key-duration": `${manualEntryDuration}ms`,
                "--settle-duration": `${revealDuration}ms`,
                "--unlock-duration": `${unlockDuration}ms`,
                "--refresh-duration": `${refreshDuration}ms`,
              } as CSSProperties
            }
          >
            <span className={styles.face} aria-hidden="true">
              {timeLockIcons.map(([phaseName, Icon]) => (
                <span
                  key={phaseName}
                  className={styles.glyph}
                  data-glyph={phaseName}
                  data-current={phaseName === state || undefined}
                >
                  <Icon strokeWidth={2.15} />
                </span>
              ))}
            </span>
          </Button>
          {hold.feedback && (
            <TimeLockCountdown
              phase={hold.feedback}
              chargeDuration={chargeDuration}
            />
          )}
        </>
      }
      description="Use the time you took the dose, even if you’re logging it later. Intakes before 06:00 go on the previous tracking day."
    >
      <div className="form-field p-4">
        <div
          className={styles.fields}
          data-intake-date-time-fields
          data-timing-pinned={pinned}
          data-timing-phase={state}
        >
          <div className={styles.field} data-timing-field="date">
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
              className={styles.input}
              data-intake-date
            />
          </div>
          <div className={styles.field} data-timing-field="time">
            <Label htmlFor={`${id}-time`}>Time Taken</Label>
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
              className={styles.input}
              data-intake-clock
            />
          </div>
          <aside className={styles.notice} aria-label="Timing help">
            <div
              className={styles.noticeHeader}
              role="status"
              aria-atomic="true"
              id={`${id}-timing-status`}
            >
              <strong>
                <Info aria-hidden="true" />
                {status}
              </strong>
              <span>{action}</span>
            </div>
            <p id={`${id}-timing-help`}>{instructions}</p>
          </aside>
        </div>
      </div>
    </CheckInSection>
  );
}
