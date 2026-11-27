"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  CalendarDays,
  Clock3,
  ClockArrowDown,
  Info,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCcw,
} from "lucide-react";
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

// Leave a gap under the arrow like the open dial on the sleep score.
const chargeArc = "M9.39 30.61a15 15 0 1 1 21.22 0";
// Matching control points let the shaft unroll without detaching from its tip.
const curvedShaft = "M4.5 10 C4.5 0 21 1 18.5 10 C17.2 14.6 12 13.8 12 19";
const straightShaft = "M12 2 C12 5 12 8 12 10 C12 13 12 16 12 19";
const revealDuration = 580;
const unlockDuration = 820;
const noticeHeadings = {
  idle: ["Time unlocked", "Tap for now"],
  fixed: ["Time locked", "Tap to unlock"],
  charging: ["Keep holding", "Release to cancel"],
  ready: ["Ready to lock", "Release to lock"],
  resetting: ["Unlocking time", "Returning to now"],
} as const;

function unrollArrow(animation: SVGAnimateElement | null) {
  if (animation && !reducedMotion()) animation.beginElement();
}

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
      entering: chargeDuration,
      settling: revealDuration,
      resetting: unlockDuration,
      refreshing: 460,
    };
    if (phase === "idle" || phase === "waiting") return;
    const timer = setTimeout(() => {
      finishReset();
      setPhase(phase === "entering" && !reducedMotion() ? "settling" : "idle");
    }, durations[phase]);
    return () => clearTimeout(timer);
  }, [phase, motionKey, chargeDuration, finishReset]);

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

  const winding = state === "charging" || state === "entering";
  const revealing = state === "ready" || state === "settling";
  const StartIcon =
    hold.stage === "charging" && pinned ? ClockArrowDown : RotateCcw;
  const LockIcon = pinned ? LockKeyhole : LockKeyholeOpen;
  const [status, action] =
    noticeHeadings[
      hold.stage ??
        (phase === "resetting" ? "resetting" : pinned ? "fixed" : "idle")
    ];
  const instructions =
    phase === "resetting"
      ? "The date and time return to now together. Your saved intakes keep their original timestamps."
      : pinned
        ? "New and edited intakes share this time. Both fields stay editable. Hold again to lock the current time."
        : "Hold for a bit more than a second, then release. Both values carry over. Editing either field locks both.";

  return (
    <div
      className={styles.fields}
      data-intake-date-time-fields
      data-timing-pinned={pinned}
      data-timing-phase={state}
      style={{ "--unlock-duration": `${unlockDuration}ms` } as CSSProperties}
    >
      <div className={styles.field} data-timing-field="date">
        <Label htmlFor={`${id}-date`} className={styles.fieldLabel}>
          Date Taken <CalendarDays aria-hidden="true" />
        </Label>
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
      <div className={styles.field} data-timing-field="time">
        <Label htmlFor={`${id}-time`} className={styles.fieldLabel}>
          Time Taken <Clock3 aria-hidden="true" />
        </Label>
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
        <Label htmlFor={`${id}-lock`} className={styles.fieldLabel}>
          Time Lock <LockIcon aria-hidden="true" />
        </Label>
        <button
          ref={button}
          id={`${id}-lock`}
          type="button"
          className={`${inputSurface} ${styles.input} ${styles.resetButton}`}
          {...hold.handlers}
          disabled={locked}
          aria-pressed={pinned}
          aria-describedby={`${id}-timing-status ${id}-timing-help`}
          data-intake-time-reset
          data-state={state}
          data-clock-face={
            (state !== "idle" &&
              state !== "waiting" &&
              state !== "refreshing") ||
            undefined
          }
          style={
            {
              "--charge-duration": `${chargeDuration}ms`,
              "--reveal-duration": `${revealDuration}ms`,
            } as CSSProperties
          }
        >
          <span key={motionKey} className={styles.face} aria-hidden="true">
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
              <rect
                className={styles.innerSeam}
                x="4.5"
                y="4.5"
                width="91"
                height="31"
                rx="8"
                pathLength="100"
              />
            </svg>
            {winding && (
              <svg className={styles.gauge} viewBox="0 0 40 40" fill="none">
                <defs>
                  <linearGradient
                    id={`${id}-arc`}
                    x1="0%"
                    y1="90%"
                    x2="100%"
                    y2="10%"
                  >
                    <stop stopColor="#fda4af" />
                    <stop offset=".48" stopColor="#ffe4ed" />
                    <stop offset="1" stopColor="#c4a9ff" />
                  </linearGradient>
                </defs>
                <path
                  className={styles.ticks}
                  d="M20 1v2M6.56 6.56l1.42 1.42M1 20h2M33.44 6.56l-1.42 1.42M39 20h-2"
                />
                <path className={styles.track} d={chargeArc} />
                <g className={styles.chargeArc} stroke={`url(#${id}-arc)`}>
                  <path
                    pathLength="1"
                    d={chargeArc}
                    strokeWidth="5"
                    opacity=".18"
                  />
                  <path pathLength="1" d={chargeArc} strokeWidth="1.85" />
                </g>
              </svg>
            )}
            <span className={styles.glyph}>
              {state === "resetting" && (
                <svg
                  className={styles.releaseBurst}
                  viewBox="-34 -25 68 50"
                  fill="none"
                >
                  <g
                    className={styles.rays}
                    strokeLinecap="round"
                    strokeWidth="2.2"
                  >
                    <path
                      d="m-17 -5 -10 -4m39 -4 5 -6m-12 33 3 6"
                      stroke="#fda4af"
                    />
                    <path
                      d="m18 1 12 -2m-41 12 -6 7m11 -31 -3 -7"
                      stroke="#fcd58d"
                    />
                    <path d="m14 8 9 6m-39 -13 -12 3" stroke="#c4b5fd" />
                  </g>
                  <g className={styles.releaseStars}>
                    <path
                      d={lunarStarPath}
                      transform="translate(-22 -10)"
                      fill="#fde7b4"
                    />
                    <path
                      d={lunarStarPath}
                      transform="translate(19 10) scale(.78)"
                      fill="#ffb8ea"
                    />
                    <path
                      d="m6 -17 1.6 -2.2 1.6 2.2 -1.6 2.2zM-8 14l1.3 -1.8 1.3 1.8 -1.3 1.8z"
                      fill="#b9edff"
                    />
                  </g>
                </svg>
              )}
              <StartIcon
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
                <g className={styles.timepiece}>
                  <path
                    className={styles.dial}
                    pathLength="1"
                    d="M12.337 21.994a10 10 0 1 1 9.588-8.767"
                  />
                  <path className={styles.hands} d="M12 6v6l2 1" />
                </g>
                <g className={styles.arrow}>
                  <path d={winding ? curvedShaft : straightShaft}>
                    {revealing && (
                      <animate
                        ref={unrollArrow}
                        attributeName="d"
                        from={curvedShaft}
                        to={straightShaft}
                        begin="indefinite"
                        dur="0.21s"
                        calcMode="spline"
                        keyTimes="0;1"
                        keySplines=".24 0 .22 1"
                        fill="freeze"
                      />
                    )}
                  </path>
                  <path d="m5 12 7 7 7-7" />
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
                <path
                  className={styles.starCore}
                  d={lunarStarPath}
                  fill="currentColor"
                />
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
  );
}
