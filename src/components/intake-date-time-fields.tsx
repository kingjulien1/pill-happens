"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Anchor,
  CalendarClock,
  ClockCheck,
  Hourglass,
  KeyRound,
  LockKeyhole,
  LockKeyholeOpen,
  Stamp,
  Timer,
  TimerReset,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useHoldPress } from "./use-hold-press";
import { HoldCountdown, timeLockCaption } from "./time-lock-countdown";
import { TimeLockStopwatch } from "./time-lock-stopwatch";
import { CheckInSection } from "./check-in-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

const TIME_LOCK_PRESS = { delay: 300, duration: 2333 };
const TIME_LOCK_PULL_DISTANCE = 64;

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
const lockStatus = {
  idle: "Unlocked",
  fixed: "Locked",
  resetting: "Unlocking…",
  refreshing: "Refreshing…",
} as const;

function TimingField({
  id,
  type,
  ...inputProps
}: Omit<
  ComponentProps<typeof Input>,
  "className" | "children" | "onKeyDown"
> & {
  id: string;
  type: "date" | "time";
}) {
  return (
    <div className={styles.field} data-timing-field={type}>
      <Label htmlFor={id} className={styles.fieldLabel}>
        <span id={`${id}-label`}>
          {type === "date" ? "Date Taken" : "Time Taken"}
        </span>
        <span aria-hidden="true" className={styles.labelDot} />
        <span aria-hidden="true" className={styles.labelStatus}>
          <LockKeyhole className={styles.indicator} />
          <span>Locked</span>
        </span>
      </Label>
      <Input
        {...inputProps}
        id={id}
        aria-labelledby={`${id}-label`}
        type={type}
        className={`${styles.input} focus:border-ring focus:ring-3 focus:ring-ring/50 dark:enabled:hover:bg-input/50`}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

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
    if (locked || resetting.current) return;
    cancelCommit();
    edited.current = false;
    onFix();
    setPhase(reducedMotion() ? "idle" : "settling");
  };
  const hold = useHoldPress(locked, resetTiming, fixTiming, {
    ...TIME_LOCK_PRESS,
    downwardPull: {
      distance: TIME_LOCK_PULL_DISTANCE,
      onProgress(progress) {
        const anchor = button.current?.parentElement;
        if (!anchor) return;
        anchor.toggleAttribute("data-pulling", progress !== null);
        if (progress === null) anchor.style.removeProperty("--time-lock-pull");
        else anchor.style.setProperty("--time-lock-pull", String(progress));
      },
    },
  });
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
    const control = button.current;
    if (!control) return;
    let visible = false;
    const sync = () => {
      control.dataset.playing = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(control);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      delete control.dataset.playing;
    };
  }, []);

  const status = hold.stage
    ? timeLockCaption(hold.stage, pinned)
    : lockStatus[
        phase === "resetting" || phase === "refreshing"
          ? phase
          : pinned
            ? "fixed"
            : "idle"
      ];
  const StatusIcon = hold.stage ? Hourglass : pinned ? Anchor : Wind;

  return (
    <CheckInSection
      caption="Timing"
      headingId={headingId}
      context={context}
      detail={
        !pinned && (
          <span
            className={styles.lockCaption}
            data-busy={hold.stage || locked || undefined}
          >
            Hold to lock
          </span>
        )
      }
      contextSeparator={
        <svg
          className={styles.timingTicks}
          viewBox="0 0 26 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M2 5v2m5-4v6m12-6v6m5-4v2" opacity=".55" />
          <path d="M13 1v10" />
        </svg>
      }
      description={
        <>
          <span key={String(pinned)} className={styles.changingCopy}>
            {pinned
              ? "Your saved time carries over until you unlock it."
              : "Choose the date and time you took this dose."}
          </span>
          Before 06:00, doses count toward the previous day.
        </>
      }
      action={
        <>
          <Button
            ref={button}
            type="button"
            variant="outline"
            size="icon"
            className={`${styles.lockControl} ${styles.resetButton}`}
            aria-label="Time Lock"
            title={
              pinned
                ? "Use current time · Hold or pull down to relock"
                : "Tap for now · Hold or pull down to lock"
            }
            {...hold.handlers}
            disabled={locked}
            aria-pressed={pinned}
            aria-describedby={`${id}-timing-status ${id}-timing-help`}
            data-intake-time-reset
            data-base-ui-swipe-ignore=""
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
                  <Icon className="size-[1.171875rem]" strokeWidth={2.15} />
                </span>
              ))}
            </span>
          </Button>
          {hold.feedback && (
            <HoldCountdown
              phase={hold.feedback}
              pinned={pinned}
              chargeDuration={chargeDuration}
              getChargeElapsed={hold.getChargeElapsed}
            />
          )}
        </>
      }
    >
      <div
        className={styles.timingBody}
        data-pinned={pinned}
        data-timing-phase={state}
      >
        <div
          className={styles.fields}
          data-intake-date-time-fields
          data-timing-pinned={pinned}
        >
          <TimingField
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
            disabled={locked}
            required
            aria-describedby={`${id}-timing-status`}
            data-intake-date
          />
          <TimingField
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
            disabled={locked}
            required
            aria-describedby={`${id}-timing-status`}
            data-intake-clock
          />
        </div>
        <aside
          className={styles.lockGuide}
          data-pinned={pinned}
          aria-labelledby={`${id}-guide-title`}
        >
          <div className={styles.guideHeading}>
            <TimeLockStopwatch pinned={pinned} />
            <div>
              <h4 id={`${id}-guide-title`}>
                How <span className="whitespace-nowrap">Time Lock</span> works
              </h4>
              <p
                key={String(pinned)}
                className={`${styles.guideSubtitle} ${styles.changingCopy}`}
              >
                {pinned
                  ? "Pinned for your next log."
                  : "Reuse a date and time."}
              </p>
            </div>
          </div>
          <p
            key={String(pinned)}
            className={`${styles.guideHelp} ${styles.changingCopy}`}
            id={`${id}-timing-help`}
          >
            {pinned
              ? "Tap to use the current time again. To pin a fresh timestamp, hold or pull the button down to its stop, then release. You can still edit either field."
              : "Hold for about 2⅓ seconds, or pull the button down to its stop. Release to lock the date and time. Editing either field also locks both."}
          </p>
          <span
            className={styles.guideStatus}
            data-unlocked={status === lockStatus.idle || undefined}
            role="status"
            aria-atomic="true"
            id={`${id}-timing-status`}
          >
            <span key={status} className={styles.statusContent}>
              <StatusIcon aria-hidden="true" size="1.15em" />
              {status}
            </span>
          </span>
        </aside>
      </div>
    </CheckInSection>
  );
}
