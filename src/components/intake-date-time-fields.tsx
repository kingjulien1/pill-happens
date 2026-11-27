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
import { CheckInSection } from "./check-in-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalInput } from "@/lib/domain";
import styles from "./intake-date-time-fields.module.css";

const TIME_LOCK_PRESS = { delay: 300, duration: 1750 };

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

const spark = "M0 -3 Q.5 -.6 2.5 0 Q.5 .5 0 3 Q-.5 .5 -2.5 0 Q-.5 -.6 0 -3Z";

function TimeLockSparks() {
  return (
    <svg
      className={`${styles.sparks} size-full`}
      viewBox="-24 -24 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <path d={spark} transform="translate(-14 -21)" />
        <path d={spark} transform="translate(22 -6) scale(.8)" />
        <path d={spark} transform="translate(11 21) scale(.85)" />
        <path d={spark} transform="translate(-22 9) scale(.65)" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="m10 -21 1 -3 M21 13l2.5 1.5 M-9 21l-1 2.5 M-21 -12l-2.5 -1" />
        <path d="M-2 -23v-.7 M23 1l.7 .1 M3 23l-.1 .7 M-23 0l-.7 -.15" />
      </g>
    </svg>
  );
}

function TimingField({
  id,
  type,
  pinned,
  ...inputProps
}: Omit<
  ComponentProps<typeof Input>,
  "className" | "children" | "onKeyDown"
> & {
  id: string;
  type: "date" | "time";
  pinned: boolean;
}) {
  const Icon = pinned ? LockKeyhole : LockKeyholeOpen;
  const indicator = (
    <Icon
      className={styles.indicator}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
    />
  );
  return (
    <div className={styles.field} data-timing-field={type}>
      <Label htmlFor={id} className={styles.fieldLabel}>
        {type === "date" ? "Date Taken" : "Time Taken"}
        <span aria-hidden="true" className={styles.labelDot} />
        {indicator}
      </Label>
      <div className={styles.inputWrap}>
        <Input
          {...inputProps}
          id={id}
          type={type}
          className={`${styles.input} focus:border-ring focus:ring-3 focus:ring-ring/50 dark:enabled:hover:bg-input/50`}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        {indicator}
      </div>
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
  const [guideGesture, setGuideGesture] = useState<"tap" | "hold" | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const guideActions = useRef<HTMLDivElement>(null);
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
  const hold = useHoldPress(locked, resetTiming, fixTiming, TIME_LOCK_PRESS);
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
    const actions = guideActions.current;
    if (!control || !actions) return;
    const visible = new Set<Element>();
    const sync = () => {
      for (const node of [control, actions]) {
        node.dataset.playing = String(visible.has(node) && !document.hidden);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      sync();
    });
    observer.observe(control);
    observer.observe(actions);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      delete control.dataset.playing;
      delete actions.dataset.playing;
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
  const toggleGuideLabel = pinned ? "Show unlock gesture" : "Show lock gesture";
  const StatusIcon = hold.stage ? Hourglass : pinned ? Anchor : Wind;
  const actionsDisabled = locked || hold.stage !== null || phase === "settling";
  const showGesture = (gesture: "tap" | "hold") => {
    const control = button.current;
    if (!control || actionsDisabled) return;
    setGuideGesture(gesture);
    control.focus({ preventScroll: true });
    control.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion() ? "instant" : "smooth",
    });
  };

  return (
    <CheckInSection
      caption="Timing"
      headingId={headingId}
      context={context}
      description={
        <>
          {pinned
            ? "Your saved time carries over until you unlock it."
            : "Choose the date and time you took this dose."}
          <br />
          Before 06:00, doses count toward the previous day.
        </>
      }
      action={
        <>
          <Button
            ref={button}
            id={`${id}-lock`}
            type="button"
            variant="outline"
            size="icon"
            className={`${styles.lockControl} ${styles.resetButton}`}
            aria-label="Time Lock"
            title={
              pinned
                ? "Tap to unlock · Hold to lock the current time"
                : "Tap for now · Hold to lock the time"
            }
            {...hold.handlers}
            onBlur={() => {
              setGuideGesture(null);
              hold.handlers.onBlur();
            }}
            onKeyDown={(event) => {
              if (guideGesture && event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setGuideGesture(null);
                return;
              }
              if (event.key === " " || event.key === "Enter")
                setGuideGesture(null);
              hold.handlers.onKeyDown(event);
            }}
            onPointerDownCapture={() => setGuideGesture(null)}
            onClickCapture={() => setGuideGesture(null)}
            disabled={locked}
            aria-pressed={pinned}
            aria-describedby={`${guideGesture ? `${id}-gesture ` : ""}${id}-timing-status ${id}-timing-help`}
            data-guided={guideGesture || undefined}
            data-dialog-corner="control"
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
            <TimeLockSparks key={String(pinned)} />
          </Button>
          {guideGesture && (
            <span
              className={styles.gestureHint}
              id={`${id}-gesture`}
              role="tooltip"
            >
              {guideGesture === "tap"
                ? "Tap to unlock"
                : pinned
                  ? "Hold to relock"
                  : "Hold to lock"}
            </span>
          )}
          {hold.feedback && (
            <HoldCountdown
              phase={hold.feedback}
              pinned={pinned}
              chargeDuration={chargeDuration}
            />
          )}
        </>
      }
    >
      <div className={styles.timingBody}>
        <div
          className={styles.fields}
          data-intake-date-time-fields
          data-timing-pinned={pinned}
          data-timing-phase={state}
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
            pinned={pinned}
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
            pinned={pinned}
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
            <Timer aria-hidden="true" className="size-[1.2rem] shrink-0" />
            <div>
              <h4 id={`${id}-guide-title`}>
                How <span className="whitespace-nowrap">Time Lock</span> works
              </h4>
              <p className={styles.guideSubtitle}>
                {pinned
                  ? "Pinned for your next log."
                  : "Reuse a date and time."}
              </p>
            </div>
          </div>
          <div className={styles.guideActions} ref={guideActions}>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={styles.lockControl}
              aria-label={toggleGuideLabel}
              title={toggleGuideLabel}
              disabled={actionsDisabled}
              focusableWhenDisabled={!disabled}
              aria-controls={`${id}-lock`}
              onClick={() => showGesture(pinned ? "tap" : "hold")}
            >
              <LockKeyhole aria-hidden="true" className="size-4" />
              <TimeLockSparks key={String(pinned)} />
            </Button>
            {pinned && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={styles.lockControl}
                aria-label="Show relock gesture"
                title="Show relock gesture"
                disabled={actionsDisabled}
                focusableWhenDisabled={!disabled}
                aria-controls={`${id}-lock`}
                onClick={() => showGesture("hold")}
              >
                <span className={styles.relockIcon} aria-hidden="true">
                  <TimerReset className="size-[18px]" />
                  <LockKeyhole className="size-3" strokeWidth={2.5} />
                </span>
                <TimeLockSparks />
              </Button>
            )}
          </div>
          <p className={styles.guideHelp} id={`${id}-timing-help`}>
            {pinned
              ? "Tap Time Lock to use the current time again. To pin a fresh timestamp, hold until the ring fills and release. You can still edit either field."
              : `Hold Time Lock for ${TIME_LOCK_PRESS.duration / 1000} seconds, then release when the ring fills. Changing the date or time by hand also locks both values.`}
          </p>
          <span
            className={styles.guideStatus}
            data-unlocked={status === lockStatus.idle || undefined}
            role="status"
            aria-atomic="true"
            id={`${id}-timing-status`}
          >
            <StatusIcon aria-hidden="true" size="1.15em" />
            {status}
          </span>
        </aside>
      </div>
    </CheckInSection>
  );
}
