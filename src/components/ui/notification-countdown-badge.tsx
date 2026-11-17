"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import styles from "./notification-countdown-badge.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
const movement = 1.225;
const ease = "cubic-bezier(.16,1,.3,1)";

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const reducedServerSnapshot = () => true;

// A replacement and the final departure share this exact small snap-and-turn.
// Only the shell's subsequent fade distinguishes the end of the countdown.
const numberDeparture: Keyframe[] = [
  { opacity: 1, transform: "none" },
  {
    opacity: 1,
    transform: `translateY(${-movement}px) rotate(-8deg) scale(1.08)`,
    offset: 0.24,
  },
  {
    opacity: 0.5,
    transform: `translate(${-3 * movement}px, ${-5 * movement}px) rotate(-120deg) scale(.6)`,
    offset: 0.64,
  },
  {
    opacity: 0,
    transform: `translate(${-5 * movement}px, ${-7 * movement}px) rotate(-210deg) scale(.12)`,
  },
];

/** A visual last-three-seconds cue; the notification clock owns all time. */
export function NotificationCountdownBadge({
  seconds,
  paused = false,
  hidden = false,
}: {
  /** Supply 1–3, then null at completion to retain the last digit's departure. */
  seconds: number | null;
  paused?: boolean;
  /** Hidden/rear notices keep their clocks; decoration waits until visible. */
  hidden?: boolean;
}) {
  const badge = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const outgoing = useRef<HTMLSpanElement>(null);
  const flare = useRef<HTMLSpanElement>(null);
  const animations = useRef<Animation[]>([]);
  const displayed = useRef<number | null>(null);
  const serial = useRef(0);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedSnapshot,
    reducedServerSnapshot,
  );
  const stopped = paused || hidden;
  const stopRef = useRef(stopped);

  useLayoutEffect(() => {
    stopRef.current = stopped;
  }, [stopped]);

  const next =
    seconds !== null && Number.isFinite(seconds) && seconds > 0 && seconds <= 3
      ? Math.ceil(seconds)
      : null;

  useLayoutEffect(() => {
    const element = badge.current;
    const value = current.current;
    const previousValue = outgoing.current;
    if (!element || !value || !previousValue || next === displayed.current)
      return;

    const previous = displayed.current;
    displayed.current = next;
    const run = ++serial.current;
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    previousValue.textContent = previous === null ? "" : String(previous);
    value.textContent = next === null ? "" : String(next);

    const animate = (
      target: Element,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      const animation = target.animate(frames, { fill: "both", ...options });
      if (stopRef.current) animation.pause();
      animations.current.push(animation);
      return animation;
    };

    if (next === null) {
      element.dataset.state = "exiting";
      if (reduced) {
        const fade = animate(element, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 100,
          easing: "linear",
        });
        fade.onfinish = () => {
          if (serial.current === run) element.dataset.state = "hidden";
        };
        return;
      }
      animate(previousValue, numberDeparture, { duration: 340, easing: ease });
      const departure = animate(
        element,
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "rotate(-8deg) scale(.86)" },
        ],
        { delay: 180, duration: 210, easing: ease },
      );
      departure.onfinish = () => {
        if (serial.current === run) element.dataset.state = "hidden";
      };
      return;
    }

    element.dataset.state = "visible";
    if (reduced) return;
    if (previous !== null)
      animate(previousValue, numberDeparture, { duration: 340, easing: ease });
    animate(
      value,
      [
        {
          opacity: 0,
          transform: `translateY(${7 * movement}px) rotate(-42deg) scale(.45)`,
        },
        {
          opacity: 1,
          transform: `translateY(${-1.5 * movement}px) rotate(7deg) scale(1.18)`,
          offset: 0.5,
        },
        {
          opacity: 1,
          transform: `translateY(${0.5 * movement}px) rotate(-2deg) scale(.96)`,
          offset: 0.78,
        },
        { opacity: 1, transform: "none" },
      ],
      { duration: 440, delay: previous === null ? 0 : 50, easing: ease },
    );
    animate(
      element,
      previous === null
        ? [
            {
              opacity: 0,
              transform: `translate(${-6 * movement}px, ${7 * movement}px) rotate(-90deg) scale(.15)`,
            },
            {
              opacity: 1,
              transform: `translate(${movement}px, ${-2 * movement}px) rotate(10deg) scale(1.16)`,
              offset: 0.52,
            },
            {
              opacity: 1,
              transform: `translateY(${0.6 * movement}px) rotate(-3deg) scale(.96)`,
              offset: 0.76,
            },
            { opacity: 1, transform: "none" },
          ]
        : [
            { transform: "none" },
            { transform: "scale(1.14)", offset: 0.26 },
            { transform: "scale(.96)", offset: 0.64 },
            { transform: "none" },
          ],
      { duration: previous === null ? 500 : 370, easing: ease },
    );
    if (flare.current)
      animate(
        flare.current,
        [
          { opacity: 0, transform: "rotate(-15deg) scale(.86)" },
          { opacity: 0.5, transform: "scale(1.04)", offset: 0.3 },
          { opacity: 0, transform: "rotate(15deg) scale(1.55)" },
        ],
        { duration: 540, easing: ease },
      );
  }, [next, reduced]);

  useEffect(() => {
    for (const animation of animations.current) {
      if (stopped && animation.playState === "running") animation.pause();
      else if (!stopped && animation.playState === "paused") animation.play();
    }
  }, [stopped]);

  useEffect(() => {
    if (!reduced) return;
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    if (badge.current)
      badge.current.dataset.state =
        displayed.current === null ? "hidden" : "visible";
  }, [reduced]);

  useEffect(
    () => () => {
      serial.current += 1;
      displayed.current = null;
      for (const animation of animations.current) animation.cancel();
      animations.current = [];
    },
    [],
  );

  return (
    <span
      ref={badge}
      className={`journal-notification-last-seconds ${styles.badge}`}
      data-notification-countdown-badge
      data-state="hidden"
      data-paused={paused}
      data-hidden={hidden}
      aria-hidden="true"
    >
      <span ref={flare} className={styles.flare} />
      <span
        ref={outgoing}
        className={styles.outgoing}
        data-countdown-digit="outgoing"
      />
      <span
        ref={current}
        className={`journal-notification-seconds-value ${styles.value}`}
        data-countdown-digit="current"
      />
    </span>
  );
}
