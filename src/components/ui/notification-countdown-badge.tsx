"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import styles from "./notification-countdown-badge.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
const ease = "cubic-bezier(.16,1,.3,1)";

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const reducedServerSnapshot = () => true;

// The final 1 leaves through the same clipped upper edge as 3 and 2.
const digitDeparture: Keyframe[] = [
  { opacity: 1, transform: "translateY(0) rotateX(0) scale(1)" },
  {
    opacity: 1,
    transform: "translateY(1px) rotateX(-12deg) scale(1.04)",
    offset: 0.22,
  },
  { opacity: 0, transform: "translateY(-10px) rotateX(65deg) scale(.78)" },
];
const digitArrival: Keyframe[] = [
  { opacity: 0, transform: "translateY(11px) rotateX(-70deg) scale(.74)" },
  {
    opacity: 1,
    transform: "translateY(-1.5px) rotateX(9deg) scale(1.1)",
    offset: 0.6,
  },
  {
    opacity: 1,
    transform: "translateY(.5px) rotateX(-3deg) scale(.98)",
    offset: 0.83,
  },
  { opacity: 1, transform: "translateY(0) rotateX(0) scale(1)" },
];

/** A finite visual cue; the notification's reading clock remains the only timer. */
export function NotificationCountdownBadge({
  seconds,
  paused = false,
  hidden = false,
}: {
  /** Supply 1–3, then null so the final digit can complete its departure. */
  seconds: number | null;
  paused?: boolean;
  hidden?: boolean;
}) {
  const gradient = useId();
  const badge = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const outgoing = useRef<HTMLSpanElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const pulse = useRef<SVGSVGElement>(null);
  const animations = useRef(new Set<Animation>());
  const displayed = useRef<number | null>(null);
  const wasHidden = useRef(hidden);
  const serial = useRef(0);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedSnapshot,
    reducedServerSnapshot,
  );
  const next =
    seconds !== null && Number.isFinite(seconds) && seconds > 0 && seconds <= 3
      ? Math.ceil(seconds)
      : null;

  useLayoutEffect(() => {
    const shell = badge.current;
    const value = current.current;
    const oldValue = outgoing.current;
    const ring = arc.current;
    const halo = pulse.current;
    const revealed = wasHidden.current && !hidden;
    wasHidden.current = hidden;
    if (
      !shell ||
      !value ||
      !oldValue ||
      !ring ||
      !halo ||
      (next === displayed.current &&
        !reduced &&
        !hidden &&
        !paused &&
        !revealed)
    )
      return;
    const previous = revealed ? null : displayed.current;
    displayed.current = next;
    const run = ++serial.current;
    for (const animation of animations.current) animation.cancel();
    animations.current.clear();
    value.textContent = next === null ? "" : String(next);
    oldValue.textContent = previous === null ? "" : String(previous);
    const offset = next === null ? 100 : 100 - (next * 100) / 3;
    ring.style.strokeDashoffset = String(offset);

    const settle = () => {
      if (serial.current !== run) return;
      // Finished forwards-filled effects must also be cancelled before reuse.
      for (const animation of animations.current) animation.cancel();
      animations.current.clear();
      oldValue.textContent = "";
      shell.dataset.state = next === null ? "hidden" : "visible";
    };
    // A hold should show one legible digit, never a half-flipped numeral.
    if (reduced || hidden || paused || (next === null && previous === null)) {
      settle();
      return;
    }
    const animate = (
      target: Element,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      const animation = target.animate(frames, { fill: "both", ...options });
      animations.current.add(animation);
      return animation;
    };
    if (previous !== null)
      animate(oldValue, digitDeparture, { duration: 260, easing: ease });
    animate(
      ring,
      [
        {
          strokeDashoffset: String(
            previous === null ? 100 : 100 - (previous * 100) / 3,
          ),
        },
        { strokeDashoffset: String(offset) },
      ],
      { duration: 360, easing: ease },
    );

    if (next === null) {
      shell.dataset.state = "exiting";
      const exit = animate(
        shell,
        [
          { opacity: 1, transform: "translate(0,0) rotate(0) scale(1)" },
          {
            opacity: 1,
            transform: "translate(0,1px) rotate(-3deg) scale(1.02)",
            offset: 0.38,
          },
          {
            opacity: 0,
            transform: "translate(3px,4px) rotate(8deg) scale(.72)",
          },
        ],
        { delay: 120, duration: 240, easing: "cubic-bezier(.4,0,.7,1)" },
      );
      exit.onfinish = settle;
      return;
    }

    shell.dataset.state = "visible";
    animate(value, digitArrival, {
      duration: 420,
      delay: previous === null ? 0 : 45,
      easing: ease,
    });
    animate(
      shell,
      previous === null
        ? [
            {
              opacity: 0,
              transform: "translate(7px,9px) rotate(-24deg) scale(.3)",
            },
            {
              opacity: 1,
              transform: "translate(-.5px,-1px) rotate(4deg) scale(1.08)",
              offset: 0.63,
            },
            {
              opacity: 1,
              transform: "translate(0,.5px) rotate(-1deg) scale(.98)",
              offset: 0.82,
            },
            { opacity: 1, transform: "translate(0,0) rotate(0) scale(1)" },
          ]
        : [
            { transform: "rotate(0) scale(1)" },
            { transform: "rotate(-4deg) scale(.88)", offset: 0.18 },
            { transform: "rotate(3deg) scale(1.1)", offset: 0.48 },
            { transform: "rotate(-1deg) scale(.98)", offset: 0.76 },
            { transform: "rotate(0) scale(1)" },
          ],
      { duration: previous === null ? 480 : 410, easing: ease },
    );
    const beat = animate(
      halo,
      [
        { opacity: 0, transform: "rotate(-8deg) scale(.82)" },
        { opacity: 0.8, transform: "rotate(0) scale(1)", offset: 0.27 },
        { opacity: 0.22, transform: "rotate(7deg) scale(1.13)", offset: 0.65 },
        { opacity: 0, transform: "rotate(10deg) scale(1.28)" },
      ],
      { duration: 520, easing: "cubic-bezier(.2,.7,.25,1)" },
    );
    beat.onfinish = settle;
  }, [next, reduced, hidden, paused]);
  useEffect(
    () => () => {
      serial.current++;
      displayed.current = null;
      for (const animation of animations.current) animation.cancel();
      animations.current.clear();
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
      <span className={styles.face} />
      <svg className={styles.bezel} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient
            id={gradient}
            x1="4"
            y1="4"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--countdown-pearl)" />
            <stop offset=".48" stopColor="var(--countdown-orchid)" />
            <stop offset="1" stopColor="var(--countdown-pink)" />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx="20" cy="20" r="18" />
        <circle
          ref={arc}
          className={styles.arc}
          cx="20"
          cy="20"
          r="18"
          pathLength="100"
          stroke={`url(#${gradient})`}
          strokeDasharray="100 100"
          strokeDashoffset="100"
          data-countdown-arc
        />
      </svg>
      <span className={styles.digits}>
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
      <svg
        ref={pulse}
        className={styles.pulse}
        viewBox="0 0 40 40"
        fill="none"
        data-countdown-pulse
      >
        <circle cx="20" cy="20" r="15.5" />
        <path d="M20 2v3 M20 35v3 M2 20h3 M35 20h3" />
      </svg>
    </span>
  );
}
