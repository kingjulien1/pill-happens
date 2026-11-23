"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import styles from "./notification-countdown-badge.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
const rollEase = "cubic-bezier(.22,.8,.2,1)";
const windowMs = 3_000;
const rose = ["#fecdd3", "#fda4af", "#fb7185", "#e11d48", "#9f1239"];
const lightingFrames: Keyframe[] = rose.map((color, index) => ({
  color,
  offset: index / (rose.length - 1),
}));

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const reducedServerSnapshot = () => true;

// One drum: the old numeral turns through its top edge as the next rolls up.
const digitDeparture: Keyframe[] = [
  { opacity: 1, transform: "translateY(0) rotateX(0)" },
  {
    opacity: 1,
    transform: "translateY(1px) rotateX(-8deg)",
    offset: 0.16,
  },
  { opacity: 0, transform: "translateY(-11px) rotateX(88deg)" },
];
const digitArrival: Keyframe[] = [
  { opacity: 0, transform: "translateY(12px) rotateX(-88deg)" },
  { opacity: 1, transform: "translateY(2px) rotateX(-16deg)", offset: 0.42 },
  { opacity: 1, transform: "translateY(-1.2px) rotateX(9deg)", offset: 0.7 },
  { opacity: 1, transform: "translateY(.35px) rotateX(-2deg)", offset: 0.88 },
  { opacity: 1, transform: "translateY(0) rotateX(0)" },
];

/** Native visual timelines follow the reading clock; they never expire a notice. */
export function NotificationCountdownBadge({
  seconds,
  remainingMs,
  paused = false,
  hidden = false,
}: {
  /** Supply 1–3, then null so the final numeral can roll away. */
  seconds: number | null;
  /** Exact active time, sampled only at digit/hold/visibility changes. */
  remainingMs?: number;
  paused?: boolean;
  hidden?: boolean;
}) {
  const badge = useRef<HTMLSpanElement>(null);
  const lighting = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const outgoing = useRef<HTMLSpanElement>(null);
  const arc = useRef<SVGRectElement>(null);
  const glint = useRef<SVGRectElement>(null);
  const transitions = useRef(new Set<Animation>());
  const scene = useRef(new Set<Animation>());
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
  const remaining = Math.max(
    0,
    Math.min(
      windowMs,
      remainingMs !== undefined && Number.isFinite(remainingMs)
        ? remainingMs
        : (next ?? 0) * 1_000,
    ),
  );

  useLayoutEffect(() => {
    const shell = badge.current;
    const light = lighting.current;
    const aura = glow.current;
    const value = current.current;
    const oldValue = outgoing.current;
    const ring = arc.current;
    const gleam = glint.current;
    if (!shell || !light || !aura || !value || !oldValue || !ring || !gleam)
      return;
    const revealed = wasHidden.current && !hidden;
    wasHidden.current = hidden;
    const previous = revealed ? null : displayed.current;
    const changed = previous !== next;
    displayed.current = next;
    const run = ++serial.current;
    const cancel = (set: Set<Animation>) => {
      for (const animation of set) animation.cancel();
      set.clear();
    };
    const animate = (
      set: Set<Animation>,
      target: Element,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      const animation = target.animate(frames, { fill: "both", ...options });
      set.add(animation);
      return animation;
    };
    const elapsed = windowMs - remaining;
    const progress = elapsed / windowMs;
    // These static fallbacks are also the complete reduced-motion rendering.
    const segment = Math.min(rose.length - 2, Math.floor(progress * 4));
    const mix = (progress * 4 - segment) * 100;
    light.style.color = `color-mix(in srgb, ${rose[segment]} ${100 - mix}%, ${rose[segment + 1]})`;
    ring.style.strokeDashoffset = String(progress * 100);
    aura.style.opacity = String(0.46 + progress * 0.24);
    aura.style.transform = `translate(${progress * 2}px, ${progress}px) scale(${1 + progress * 0.25})`;

    if (hidden || reduced || next === null) {
      cancel(scene.current);
    } else {
      if (scene.current.size === 0) {
        const options = { duration: windowMs, easing: "linear" };
        animate(scene.current, light, lightingFrames, options);
        animate(
          scene.current,
          ring,
          [{ strokeDashoffset: "0" }, { strokeDashoffset: "100" }],
          options,
        );
        animate(
          scene.current,
          aura,
          [
            { opacity: 0.46, transform: "translate(-1px,-1px) scale(.96)" },
            {
              opacity: 0.62,
              transform: "translate(1px,-1px) scale(1.13)",
              offset: 0.5,
            },
            { opacity: 0.7, transform: "translate(2px,1px) scale(1.25)" },
          ],
          options,
        );
        animate(
          scene.current,
          gleam,
          [
            { strokeDashoffset: "8", opacity: 0 },
            { strokeDashoffset: "-8", opacity: 0.7, offset: 0.16 },
            { strokeDashoffset: "-66", opacity: 0.5, offset: 0.76 },
            { strokeDashoffset: "-92", opacity: 0 },
          ],
          options,
        );
      }
      // Resuming and revealing seek to the authoritative active-time sample;
      // no new interval or per-frame React update is needed for this cue.
      for (const animation of scene.current) {
        if (paused) animation.pause();
        animation.currentTime = elapsed;
        if (!paused) animation.play();
      }
    }

    cancel(transitions.current);
    value.textContent = next === null ? "" : String(next);
    oldValue.textContent = "";
    const settle = () => {
      if (serial.current !== run) return;
      cancel(transitions.current);
      oldValue.textContent = "";
      shell.dataset.state = next === null ? "hidden" : "visible";
    };
    // Holds always show a whole digit. A resume continues the glow without
    // replaying the flip; hidden and reduced-motion cues leave no effects alive.
    if (reduced || hidden || paused || !changed) {
      settle();
      return;
    }
    oldValue.textContent = previous === null ? "" : String(previous);
    if (previous !== null)
      animate(transitions.current, oldValue, digitDeparture, {
        duration: 340,
        easing: rollEase,
      });

    if (next === null) {
      shell.dataset.state = "exiting";
      const exit = animate(
        transitions.current,
        shell,
        [
          { opacity: 1, transform: "translateY(0) scale(1)" },
          {
            opacity: 1,
            transform: "translateY(-1px) scale(1.03)",
            offset: 0.3,
          },
          { opacity: 0, transform: "translateY(-3px) scale(.88)" },
        ],
        { delay: 110, duration: 260, easing: "cubic-bezier(.4,0,.6,1)" },
      );
      exit.onfinish = settle;
      return;
    }

    shell.dataset.state = "visible";
    if (previous === null)
      animate(
        transitions.current,
        shell,
        [
          { opacity: 0, transform: "translateY(4px) scale(.82)" },
          {
            opacity: 1,
            transform: "translateY(-.5px) scale(1.025)",
            offset: 0.74,
          },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        { duration: 440, easing: rollEase },
      );
    const arrival = animate(transitions.current, value, digitArrival, {
      duration: 560,
      easing: rollEase,
    });
    arrival.onfinish = settle;
  }, [next, remaining, reduced, hidden, paused]);

  useEffect(
    () => () => {
      serial.current++;
      displayed.current = null;
      for (const set of [transitions.current, scene.current]) {
        for (const animation of set) animation.cancel();
        set.clear();
      }
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
      <span ref={lighting} className={styles.lighting} data-countdown-lighting>
        <span ref={glow} className={styles.glow} data-countdown-glow />
        <span className={styles.face} />
        <svg className={styles.bezel} viewBox="0 0 32 32" fill="none">
          <rect
            className={styles.track}
            x="1.5"
            y="1.5"
            width="29"
            height="29"
            rx="10"
          />
          <rect
            ref={arc}
            className={styles.arc}
            x="1.5"
            y="1.5"
            width="29"
            height="29"
            rx="10"
            pathLength="100"
            strokeDasharray="100 100"
            strokeDashoffset="100"
            data-countdown-arc
          />
          <rect
            ref={glint}
            className={styles.glint}
            x="1.5"
            y="1.5"
            width="29"
            height="29"
            rx="10"
            pathLength="100"
            strokeDasharray="6 94"
            data-countdown-glint
          />
        </svg>
      </span>
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
    </span>
  );
}
