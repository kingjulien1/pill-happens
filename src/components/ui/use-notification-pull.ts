"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import {
  NOTIFICATION_PULL_MAX_OFFSET,
  NOTIFICATION_PULL_OPEN_DURATION,
  NOTIFICATION_PULL_RECOIL,
  notificationPullOffset,
  notificationPullThreshold,
  updateNotificationPull,
  type NotificationPullState,
} from "@/lib/notification-pull";

type Options = {
  root: RefObject<HTMLDivElement | null>;
  indicator: RefObject<HTMLSpanElement | null>;
  enabled: boolean;
  expanded: boolean;
  canStart: (event: PointerEvent) => boolean;
  onExpand: () => boolean;
  onCollapse: () => boolean;
  consumeClick: () => void;
  pause: (value: boolean) => void;
  resetNative: (pointer: number) => void;
};

type Session = {
  pointer: number;
  x: number;
  y: number;
  threshold: number;
  origin: number;
  expanded: boolean;
  state: NotificationPullState;
};

/** No idle animation or frame loop: pointer samples paint once per frame. */
export function useNotificationPull(options: Options) {
  const latest = useRef(options);
  const abort = useRef<() => void>(() => {});
  const settling = useRef<{
    target: boolean;
    stage: "rack" | "commit";
  } | null>(null);
  const previousExpanded = useRef(options.expanded);
  useLayoutEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const node = options.root.current;
    const cue = options.indicator.current;
    if (!node || !cue) return;
    // Move the native flow item, so every following card follows the same
    // displacement automatically, including negative recoil and settling.
    const host = node.closest<HTMLElement>("[data-sonner-toast]");
    const motionTarget = host ?? node;
    const originalMargin = host?.style.marginTop ?? "";
    const writeOffset = (y: number) => {
      if (host) host.style.marginTop = `${y}px`;
      else node.style.translate = `0px ${y}px`;
    };
    const motionFrames = (frames: Keyframe[]) =>
      host
        ? frames.map(({ translate, ...frame }) => ({
            ...frame,
            marginTop: String(translate).split(" ")[1] ?? "0px",
          }))
        : frames;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let session: Session | null = null;
    let frame = 0;
    let generation = 0;
    let blockedUntil = 0;
    let lastBurst = -Infinity;
    let activeCleanup = () => {};
    let motionCleanup = () => {};
    let disposed = false;

    const animate = (
      target: Element,
      frames: Keyframe[],
      timing: KeyframeAnimationOptions,
    ) => {
      const animation = target.animate(frames, timing);
      animations.add(animation);
      // A finished forwards-filled animation still overrides inline styles.
      // Retain it until stop() cancels the effect before the next gesture.
      void animation.finished.then(
        () => {
          if (timing.fill !== "both" && timing.fill !== "forwards")
            animations.delete(animation);
        },
        () => animations.delete(animation),
      );
      return animation;
    };
    const stop = () => {
      generation++;
      cancelAnimationFrame(frame);
      frame = 0;
      timers.forEach(clearTimeout);
      timers.clear();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    const resetPaint = () => {
      motionCleanup();
      if (host) {
        if (originalMargin) host.style.marginTop = originalMargin;
        else host.style.removeProperty("margin-top");
      } else node.style.removeProperty("translate");
      node.style.removeProperty("--notification-open-fill");
      delete node.dataset.notificationPull;
      cue.style.opacity = "0";
      cue.style.removeProperty("--pull-progress");
      delete cue.dataset.ready;
      settling.current = null;
      latest.current.pause(false);
    };
    const releaseCapture = (pointer: number) => {
      try {
        if (node.hasPointerCapture(pointer))
          node.releasePointerCapture(pointer);
      } catch {
        /* A cancelled Safari contact may already have lost capture. */
      }
    };
    const cancel = () => {
      const current = session;
      session = null;
      activeCleanup();
      stop();
      if (current) {
        latest.current.consumeClick();
        releaseCapture(current.pointer);
        latest.current.resetNative(current.pointer);
      }
      resetPaint();
    };
    abort.current = cancel;

    const burst = () => {
      if (reduced.matches || performance.now() - lastBurst < 200) return;
      lastBurst = performance.now();
      const glyph = cue.querySelector("[data-pull-glyph]");
      const ring = cue.querySelector("[data-pull-burst]");
      const rays = cue.querySelector("[data-pull-rays]");
      if (glyph)
        animate(
          glyph,
          [
            { transform: "scale(1) rotate(0deg)", offset: 0 },
            { transform: "scale(.72) rotate(-30deg)", offset: 0.16 },
            { transform: "scale(1.23) rotate(365deg)", offset: 0.66 },
            { transform: "scale(.95) rotate(358deg)", offset: 0.84 },
            { transform: "scale(1) rotate(360deg)" },
          ],
          { duration: 560, easing: "cubic-bezier(.2,.8,.25,1)" },
        );
      if (ring)
        animate(
          ring,
          [
            { opacity: 0, transform: "scale(.6) rotate(-18deg)" },
            { opacity: 0.85, offset: 0.16 },
            { opacity: 0, transform: "scale(1.85) rotate(28deg)" },
          ],
          { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
        );
      if (rays)
        animate(
          rays,
          [
            {
              opacity: 0,
              transform: "scale(.65) rotate(-18deg)",
              strokeDashoffset: "6",
            },
            { opacity: 0.85, strokeDashoffset: "0", offset: 0.22 },
            {
              opacity: 0,
              transform: "scale(1.55) rotate(14deg)",
              strokeDashoffset: "-6",
            },
          ],
          { duration: 620, easing: "cubic-bezier(.16,1,.3,1)" },
        );
    };
    const paint = () => {
      frame = 0;
      if (!session) return;
      const { state, origin, expanded } = session;
      const claimed = state.intent === "pull";
      if (claimed)
        writeOffset(
          Math.min(
            NOTIFICATION_PULL_MAX_OFFSET,
            origin + notificationPullOffset(state.distance),
          ),
        );
      node.dataset.notificationPull = state.ready ? "ready" : "pulling";
      node.style.setProperty(
        "--notification-open-fill",
        String(expanded ? 1 - state.progress : state.progress),
      );
      cue.style.opacity = String(Math.min(1, state.distance / 12));
      cue.style.setProperty("--pull-progress", String(state.progress));
      cue.dataset.ready = String(state.ready);
    };
    const sample = (event: Pick<PointerEvent, "clientX" | "clientY">) => {
      if (!session) return;
      const previous = session.state;
      session.state = updateNotificationPull(
        previous,
        event.clientX - session.x,
        event.clientY - session.y,
        session.threshold,
      );
      if (session.state.intent === "pull" && previous.intent !== "pull") {
        latest.current.consumeClick();
        latest.current.pause(true);
        const host = node.closest<HTMLElement>("[data-sonner-toast]");
        host?.style.setProperty("--swipe-amount-x", "0px");
        host?.style.setProperty("--swipe-amount-y", "0px");
        host?.dispatchEvent(new Event("dragend", { bubbles: true }));
        try {
          node.setPointerCapture(session.pointer);
        } catch {
          cancel();
          return;
        }
      }
      if (session?.state.ready && !previous.ready) burst();
    };
    const move = (event: PointerEvent) => {
      if (!session || event.pointerId !== session.pointer) return;
      if (
        !latest.current.enabled ||
        latest.current.expanded !== session.expanded ||
        !latest.current.canStart(event)
      ) {
        cancel();
        return;
      }
      try {
        for (const point of event.getCoalescedEvents?.() ?? []) sample(point);
      } catch {
        /* Current coordinates remain authoritative on older Safari. */
      }
      sample(event);
      if (session?.state.intent === "native") {
        session = null;
        activeCleanup();
        stop();
        resetPaint();
        return;
      }
      if (session?.state.intent === "pull") {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!frame && session) frame = requestAnimationFrame(paint);
    };
    const after = (callback: () => void, delay: number) => {
      const token = generation;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!disposed && token === generation) callback();
      }, delay);
      timers.add(timer);
    };
    const finish = (event: PointerEvent, cancelled = false) => {
      if (!session || event.pointerId !== session.pointer) return;
      if (!cancelled) sample(event);
      if (!session) return;
      cancelAnimationFrame(frame);
      paint();
      const current = session;
      const claimed = current.state.intent === "pull";
      const commit =
        !cancelled &&
        claimed &&
        current.state.ready &&
        latest.current.enabled &&
        latest.current.expanded === current.expanded &&
        latest.current.canStart(event);
      session = null;
      activeCleanup();
      cancelAnimationFrame(frame);
      frame = 0;
      if (claimed || cancelled) {
        event.preventDefault();
        event.stopPropagation();
        latest.current.consumeClick();
      }
      releaseCapture(current.pointer);
      if (claimed || cancelled) latest.current.resetNative(current.pointer);
      const y = claimed
        ? Math.min(
            NOTIFICATION_PULL_MAX_OFFSET,
            current.origin + notificationPullOffset(current.state.distance),
          )
        : current.origin;
      if (commit) {
        settling.current = { target: !current.expanded, stage: "rack" };
        node.dataset.notificationPull = current.expanded
          ? "closing"
          : "opening";
        const commitExpansion = () => {
          settling.current!.stage = "commit";
          return current.expanded
            ? latest.current.onCollapse()
            : latest.current.onExpand();
        };
        if (reduced.matches) {
          writeOffset(0);
          if (!commitExpansion()) {
            cancel();
            return;
          }
          after(resetPaint, 60);
          return;
        }
        const token = generation;
        const recoil = animate(
          motionTarget,
          motionFrames([
            {
              translate: `0px ${y}px`,
              offset: 0,
              easing: "cubic-bezier(.4,0,.2,1)",
            },
            {
              translate: "0px -4px",
              offset:
                NOTIFICATION_PULL_RECOIL / NOTIFICATION_PULL_OPEN_DURATION,
              easing: "cubic-bezier(.12,.8,.2,1)",
            },
            {
              translate: "0px 7px",
              offset: 0.4,
              easing: "cubic-bezier(.3,0,.3,1)",
            },
            { translate: "0px -1.5px", offset: 0.7, easing: "ease-out" },
            { translate: "0px 0px" },
          ]),
          { duration: NOTIFICATION_PULL_OPEN_DURATION, fill: "both" },
        );
        animate(
          cue,
          [{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }],
          { duration: 480, fill: "both" },
        );
        after(() => {
          if (!commitExpansion()) {
            cancel();
            return;
          }
          const content = node.querySelector(".journal-notification-main");
          if (content && !current.expanded)
            animate(
              content,
              [
                { transform: "translateY(-8px)", opacity: 0.5 },
                { transform: "translateY(3px)", opacity: 1, offset: 0.65 },
                { transform: "translateY(0px)", opacity: 1 },
              ],
              { duration: 430, easing: "cubic-bezier(.16,1,.3,1)" },
            );
        }, NOTIFICATION_PULL_RECOIL);
        void recoil.finished.then(
          () => {
            if (!disposed && token === generation) {
              stop();
              resetPaint();
            }
          },
          () => {},
        );
      } else if (
        reduced.matches ||
        (!claimed && !current.state.distance && !y)
      ) {
        resetPaint();
      } else {
        node.dataset.notificationPull = "returning";
        node.style.removeProperty("--notification-open-fill");
        const token = generation;
        const settle = animate(
          motionTarget,
          motionFrames([
            { translate: `0px ${y}px` },
            { translate: "0px -1.5px", offset: 0.68 },
            { translate: "0px 0px" },
          ]),
          { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
        );
        animate(cue, [{ opacity: Number(cue.style.opacity) }, { opacity: 0 }], {
          duration: 200,
          fill: "both",
        });
        void settle.finished.then(
          () => {
            if (!disposed && token === generation) {
              stop();
              resetPaint();
            }
          },
          () => {},
        );
      }
    };
    const down = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target?.closest(".journal-notification-summary") ||
        target.closest("a,input,textarea,select,[contenteditable]")
      )
        return;
      if (!latest.current.enabled) return;
      if (
        settling.current ||
        !event.isPrimary ||
        performance.now() < blockedUntil
      ) {
        latest.current.consumeClick();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.button !== 0 || !latest.current.canStart(event)) return;
      if (session) return;
      const offset = getComputedStyle(node).translate.split(" ");
      const origin = host
        ? parseFloat(getComputedStyle(host).marginTop) || 0
        : offset.length > 1
          ? parseFloat(offset[1]) || 0
          : 0;
      stop();
      activeCleanup();
      motionCleanup();
      if (origin) writeOffset(origin);
      cue.style.opacity = "0";
      cue.style.setProperty("--pull-progress", "0");
      delete cue.dataset.ready;
      session = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin,
        expanded: latest.current.expanded,
        threshold: notificationPullThreshold(
          event.clientX,
          event.clientY,
          window.visualViewport
            ? visualViewport!.offsetLeft + visualViewport!.width
            : innerWidth,
          window.visualViewport
            ? visualViewport!.offsetTop + visualViewport!.height
            : innerHeight,
        ),
        state: { intent: "pending", distance: 0, progress: 0, ready: false },
      };
      const globalUp = (e: PointerEvent) => {
        // Ignore the existing Sonner bridge's synthetic pointer-up checkpoint.
        if (e.isTrusted) finish(e, e.type === "pointercancel");
      };
      const interrupted = () => cancel();
      const hidden = () => {
        if (document.hidden) cancel();
      };
      const key = (e: KeyboardEvent) => {
        if (
          e.key !== "Escape" ||
          (!session && settling.current?.stage !== "rack")
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        cancel();
      };
      const multiple = (e: PointerEvent) => {
        if (session && e.pointerId !== session.pointer) {
          blockedUntil = performance.now() + 240;
          cancel();
        }
      };
      window.addEventListener("pointerup", globalUp);
      window.addEventListener("pointercancel", globalUp);
      window.addEventListener("blur", interrupted);
      window.addEventListener("resize", interrupted);
      window.addEventListener("scroll", interrupted);
      window.addEventListener("keydown", key, true);
      document.addEventListener("visibilitychange", hidden);
      document.addEventListener("pointerdown", multiple, true);
      reduced.addEventListener("change", interrupted);
      activeCleanup = () => {
        window.removeEventListener("pointerup", globalUp);
        window.removeEventListener("pointercancel", globalUp);
        document.removeEventListener("pointerdown", multiple, true);
        activeCleanup = () => {};
      };
      motionCleanup = () => {
        window.removeEventListener("keydown", key, true);
        window.removeEventListener("blur", interrupted);
        window.removeEventListener("resize", interrupted);
        window.removeEventListener("scroll", interrupted);
        document.removeEventListener("visibilitychange", hidden);
        reduced.removeEventListener("change", interrupted);
        motionCleanup = () => {};
      };
    };
    const up = (event: PointerEvent) => finish(event);
    const cancelled = (event: PointerEvent) => finish(event, true);
    const lost = (event: PointerEvent) => {
      if (
        session?.pointer === event.pointerId &&
        session.state.intent === "pull" &&
        event.target === node &&
        !node.hasPointerCapture(event.pointerId)
      )
        cancel();
    };
    node.addEventListener("pointerdown", down, true);
    node.addEventListener("pointermove", move, true);
    node.addEventListener("pointerup", up, true);
    node.addEventListener("pointercancel", cancelled, true);
    node.addEventListener("lostpointercapture", lost, true);
    return () => {
      disposed = true;
      cancel();
      abort.current = () => {};
      node.removeEventListener("pointerdown", down, true);
      node.removeEventListener("pointermove", move, true);
      node.removeEventListener("pointerup", up, true);
      node.removeEventListener("pointercancel", cancelled, true);
      node.removeEventListener("lostpointercapture", lost, true);
    };
  }, [options.root, options.indicator]);

  useEffect(() => {
    const changed = previousExpanded.current !== options.expanded;
    previousExpanded.current = options.expanded;
    if (
      !options.enabled ||
      (changed &&
        (!settling.current ||
          settling.current.stage !== "commit" ||
          options.expanded !== settling.current.target))
    )
      abort.current();
  }, [options.enabled, options.expanded]);
}
