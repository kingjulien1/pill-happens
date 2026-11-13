"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import styles from "./page-refresh.module.css";
import { BrandMark } from "@/components/brand";
import { useJournal } from "@/components/journal-provider";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { createBrandHoverMotion } from "@/lib/brand-hover-motion";
import { getBrandThemeStyle } from "@/lib/action-button-system";
import {
  BRAND_REFRESH_SLOP,
  BRAND_REFRESH_THRESHOLD,
  BRAND_PULL_EXCHANGE_END,
  brandPullOffset,
  advanceBrandPullMotion,
  advanceBrandPullExchange,
  advanceBrandPullSpring,
  getBrandPullFeedback,
  getBrandPullRelease,
  getBrandPullAction,
  getBrandPullThreshold,
  getBrandPullThresholds,
  updateBrandPull,
  type BrandPullAction,
  type BrandPullPose,
  type BrandPullState,
  type BrandPullSpring,
  type BrandPullThresholds,
} from "@/lib/brand-refresh";
import {
  beginPageRefresh,
  finishPageRefresh,
  getPageRefreshPhase,
  getServerPageRefreshPhase,
  restorePageRefreshScroll,
  subscribePageRefresh,
  PAGE_REFRESH_SEQUENCE,
} from "@/lib/page-refresh-handoff";

import { notifyPageEntryReadiness } from "@/lib/page-entry-readiness";

type PageRefreshContext = { refreshPage: () => void; unavailable: boolean };
const Context = createContext<PageRefreshContext | null>(null);

export function PageRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, error, busy } = useJournal();
  const { ready } = useJournalWorkspace();
  const phase = useSyncExternalStore(
    subscribePageRefresh,
    getPageRefreshPhase,
    getServerPageRefreshPhase,
  );
  const entryReady = phase === "idle" && Boolean(error || (data && ready));
  useLayoutEffect(() => {
    notifyPageEntryReadiness();
  }, [entryReady]);

  const requested = useRef(false);
  const firstFrame = useRef(0);
  const secondFrame = useRef(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "idle") return;
    requested.current = false;
    cancelAnimationFrame(firstFrame.current);
    cancelAnimationFrame(secondFrame.current);
    firstFrame.current = secondFrame.current = 0;
    if (reloadTimer.current !== null) clearTimeout(reloadTimer.current);
    reloadTimer.current = null;
  }, [phase]);

  useEffect(() => {
    if (phase !== "restoring" || (!error && !(data && ready))) return;
    // The draft workspace has its own two-frame scroll/focus restoration.
    // Leave it mounted and let those commits finish under the same opaque cover.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        restorePageRefreshScroll();
        finishPageRefresh();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [data, error, phase, ready]);

  useEffect(
    () => () => {
      cancelAnimationFrame(firstFrame.current);
      cancelAnimationFrame(secondFrame.current);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    },
    [],
  );

  const refreshPage = useCallback(() => {
    if (busy || phase !== "idle" || requested.current) return;
    requested.current = true;
    if (!beginPageRefresh()) {
      // A browser that blocks the early cosmetic script can still reload.
      if (getPageRefreshPhase() === "idle") window.location.reload();
      return;
    }
    // Paint the charge and burst before replacing the document. This time counts
    // toward the same minimum visibility window; page entrances remain gated.
    firstFrame.current = requestAnimationFrame(() => {
      secondFrame.current = requestAnimationFrame(() => {
        const hold = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? 0
          : PAGE_REFRESH_SEQUENCE.outgoingHold;
        reloadTimer.current = setTimeout(() => {
          reloadTimer.current = null;
          if (getPageRefreshPhase() === "reloading") window.location.reload();
        }, hold);
      });
    });
  }, [busy, phase]);

  const unavailable = busy || phase !== "idle";
  const restoringContent = Boolean(data && ready);
  return (
    <Context.Provider value={{ refreshPage, unavailable }}>
      <div
        data-page-refresh-content
        data-page-entry-ready={entryReady}
        inert={phase === "reloading" || (phase !== "idle" && !restoringContent)}
        aria-busy={phase !== "idle" || undefined}
      >
        {children}
      </div>
    </Context.Provider>
  );
}

export function usePageRefresh() {
  const context = useContext(Context);
  if (!context) throw new Error("Page refresh provider is missing.");
  return context;
}

type PullGesture = {
  pointer: number;
  x: number;
  y: number;
  origin: { x: number; y: number };
  state: BrandPullState;
  thresholds: BrandPullThresholds;
};

/** Pause the shared menu-logo loop when its refresh control is unavailable. */
function useBrandMotion(unavailable: boolean) {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = mark.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const button = node.closest<HTMLButtonElement>(".header-refresh-button");
    const hoverMotion = createBrandHoverMotion(node);
    // A short drag reruns this effect while the pointer can remain over the
    // control; no new pointerenter is guaranteed after pointer capture ends.
    let hovered = fineHover.matches && Boolean(button?.matches(":hover"));
    let visible = typeof IntersectionObserver !== "function";
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      const paused =
        unavailable || reduced.matches || document.hidden || !visible;
      node.dataset.brandPaused = String(paused);
      hoverMotion.update(hovered && fineHover.matches && !paused);
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hovered = fineHover.matches;
      sync();
    };
    const leave = () => {
      hovered = false;
      sync();
    };
    const hoverCapability = () => {
      hovered = fineHover.matches && Boolean(button?.matches(":hover"));
      sync();
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            sync();
          })
        : null;
    observer?.observe(node);
    sync();
    reduced.addEventListener("change", sync);
    fineHover.addEventListener("change", hoverCapability);
    document.addEventListener("visibilitychange", sync);
    button?.addEventListener("pointerenter", enter);
    button?.addEventListener("pointerleave", leave);
    button?.addEventListener("pointercancel", leave);
    // Reduced motion can remove/recreate CSSAnimation objects in place.
    node.addEventListener("animationstart", sync);
    return () => {
      disposed = true;
      observer?.disconnect();
      reduced.removeEventListener("change", sync);
      fineHover.removeEventListener("change", hoverCapability);
      document.removeEventListener("visibilitychange", sync);
      button?.removeEventListener("pointerenter", enter);
      button?.removeEventListener("pointerleave", leave);
      button?.removeEventListener("pointercancel", leave);
      node.removeEventListener("animationstart", sync);
      node.dataset.brandPaused = "true";
      hoverMotion.dispose();
    };
  }, [unavailable]);
  return mark;
}

/** One frame owner composes steering, readiness recoil and the return-to-origin bounce. */
function createBrandPullMotion(node: HTMLElement, instant: () => boolean) {
  let current: BrandPullPose = { x: 0, y: 0, progress: 0 };
  let target = current;
  let exchange = 0;
  let exchangeTarget = 0;
  let response: BrandPullSpring = { value: 0, velocity: 0 };
  let home: BrandPullSpring = { value: 0, velocity: 0 };
  let ready = false;
  let action: BrandPullAction | null = null;
  let homeArmed = false;
  let homePending = false;
  let frame = 0;
  let lastTime = 0;
  let returning = false;
  let paintedIconTurn = -310;
  let returnIconTurn: number | undefined;
  let disposed = false;
  const paint = () => {
    const feedback = getBrandPullFeedback(
      current.progress,
      response.value,
      home.value,
      action,
      exchange,
      returnIconTurn,
    );
    paintedIconTurn = feedback.iconTurn;
    const properties = {
      "--brand-pull-x": `${current.x.toFixed(3)}px`,
      "--brand-pull": `${current.y.toFixed(3)}px`,
      "--brand-pull-progress": current.progress.toFixed(5),
      "--brand-pull-reveal": feedback.reveal.toFixed(5),
      "--brand-pull-button-scale": feedback.buttonScale.toFixed(5),
      "--brand-pull-icon-scale": feedback.iconScale.toFixed(5),
      "--brand-pull-icon-turn": `${feedback.iconTurn.toFixed(3)}deg`,
      "--brand-pull-tilt": `${feedback.buttonTilt.toFixed(3)}deg`,
      "--brand-pull-flare": feedback.flare.toFixed(5),
      "--brand-pull-edge-alpha": "0.67",
      "--brand-pull-pill-opacity": feedback.pillOpacity.toFixed(5),
      "--brand-pull-pill-scale": feedback.pillScale.toFixed(5),
      "--brand-pull-pill-turn": `${feedback.pillTurn.toFixed(3)}deg`,
      "--brand-pull-wash": feedback.wash.toFixed(5),
      "--brand-pull-edge": feedback.edge.toFixed(5),
      "--brand-pull-ready": feedback.readiness.toFixed(5),
    };
    for (const [name, value] of Object.entries(properties))
      node.style.setProperty(name, value);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const settled = () =>
    current.x === target.x &&
    current.y === target.y &&
    current.progress === target.progress &&
    exchange === exchangeTarget &&
    response.value === Number(ready) &&
    response.velocity === 0 &&
    home.value === 0 &&
    home.velocity === 0 &&
    !homePending;
  const tick = (time: number) => {
    frame = 0;
    if (disposed) return;
    const elapsed = time - lastTime;
    if (instant()) {
      current = target;
      exchange = exchangeTarget;
      response = { value: Number(ready), velocity: 0 };
      home = { value: 0, velocity: 0 };
      homePending = false;
    } else {
      current = advanceBrandPullMotion(current, target, elapsed, returning);
      exchange = advanceBrandPullExchange(exchange, exchangeTarget, elapsed);
      response = advanceBrandPullSpring(response, Number(ready), elapsed);
      if (homePending && current.progress < 0.025) {
        home = { value: home.value, velocity: -8 };
        homePending = false;
      }
      home = advanceBrandPullSpring(home, 0, elapsed);
    }
    lastTime = time;
    paint();
    if (!settled()) frame = requestAnimationFrame(tick);
  };
  const to = (
    pose: BrandPullPose,
    pulling: boolean,
    armed: boolean,
    direction: BrandPullAction | null,
    physicalProgress = pose.progress,
  ) => {
    if (disposed) return;
    target = pose;
    // Readiness can adapt to a narrow viewport; the pill exchange stays 112px.
    exchangeTarget = Math.max(
      0,
      Math.min(physicalProgress, BRAND_PULL_EXCHANGE_END),
    );
    // Return by position and scale only; never unwind the visible action icon.
    if (!pulling && !returning) returnIconTurn = paintedIconTurn;
    if (pulling) returnIconTurn = undefined;
    returning = !pulling;
    ready = armed;
    if (direction) action = direction;
    if (pose.progress > 0.001) {
      homeArmed = true;
      homePending = false;
    } else if (homeArmed) {
      homePending = true;
      homeArmed = false;
    }
    if (instant()) {
      stop();
      current = target;
      exchange = exchangeTarget;
      response = { value: Number(ready), velocity: 0 };
      home = { value: 0, velocity: 0 };
      homePending = false;
      paint();
    } else if (!frame && !settled()) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  paint();
  return {
    to,
    hold() {
      stop();
      // Keep all visible feedback in place when grabbing an unfinished return.
      target = current;
      exchangeTarget = exchange;
      ready = false;
      homePending = false;
      homeArmed = current.progress > 0.001;
      paint();
      return { x: current.x, y: current.y };
    },
    sync: () => to(target, !returning, ready, action, exchangeTarget),
    dispose() {
      disposed = true;
      stop();
    },
  };
}

export function CompactRefreshBrand() {
  const { refreshPage, unavailable } = usePageRefresh();
  const router = useRouter();
  const path = usePathname();
  const workspace = useJournalWorkspace();
  const [preview, setPreview] = useState<{
    action: BrandPullAction | null;
    feedbackAction: BrandPullAction | null;
    lockedAction: BrandPullAction | null;
    ready: boolean;
    visible: boolean;
  }>({
    action: null,
    feedbackAction: null,
    lockedAction: null,
    ready: false,
    visible: false,
  });
  const previewRef = useRef(preview);
  const { action, feedbackAction, lockedAction, ready, visible } = preview;
  const [dragging, setDragging] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const pendingRelease = useRef<{
    action: BrandPullAction | "home";
    path: string;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const gesture = useRef<PullGesture | null>(null);
  const suppressClick = useRef(false);
  const handle = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const motion = useRef<ReturnType<typeof createBrandPullMotion> | null>(null);
  const mark = useBrandMotion(unavailable || dragging || releasing);
  const hintId = useId();
  const [chargeSession, setChargeSession] = useState(0);
  const [burst, setBurst] = useState<{
    sequence: number;
    kind: "ready" | "release" | "home";
  } | null>(null);
  const burstSequence = useRef(0);
  const lastBurst = useRef(-Infinity);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playBurst = useCallback((kind: "ready" | "release" | "home") => {
    const now = performance.now();
    // Threshold jitter cannot create an endless particle stream.
    if (kind === "ready" && now - lastBurst.current < 520) return;
    lastBurst.current = now;
    burstSequence.current = (burstSequence.current + 1) % 6;
    setBurst({ sequence: burstSequence.current, kind });
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(
      () => setBurst(null),
      kind === "home" ? 680 : 1400,
    );
  }, []);
  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (pendingRelease.current?.timer)
        clearTimeout(pendingRelease.current.timer);
      pendingRelease.current = null;
    },
    [],
  );

  const settlePull = useCallback(() => {
    motion.current?.to({ x: 0, y: 0, progress: 0 }, false, false, null);
    const hidden = {
      ...previewRef.current,
      action: null,
      lockedAction: null,
      ready: false,
      visible: false,
    };
    previewRef.current = hidden;
    setPreview(hidden);
  }, []);

  const endPull = useCallback(
    (cancelled: boolean, holdReady = false) => {
      const current = gesture.current;
      if (!current) return;
      // Lost capture may dispatch synchronously; the gesture is already finished.
      gesture.current = null;
      suppressClick.current ||= cancelled || current.state.moved;
      if (!holdReady) settlePull();
      setDragging(false);
      try {
        if (handle.current?.hasPointerCapture(current.pointer))
          handle.current.releasePointerCapture(current.pointer);
      } catch {
        /* Safari may have released an interrupted touch capture already. */
      }
    },
    [settlePull],
  );

  const cancelRelease = useCallback(() => {
    const pending = pendingRelease.current;
    if (!pending) return;
    pendingRelease.current = null;
    if (pending.timer) clearTimeout(pending.timer);
    setReleasing(false);
    setBurst(null);
    settlePull();
  }, [settlePull]);
  const cancelPull = useCallback(() => {
    endPull(true);
    cancelRelease();
  }, [endPull, cancelRelease]);

  useLayoutEffect(() => {
    const node = surface.current;
    if (!node) return;
    const button = handle.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = createBrandPullMotion(
      node,
      () => reduced.matches || document.hidden,
    );
    motion.current = controller;
    const sync = () => controller.sync();
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      const current = gesture.current;
      gesture.current = null;
      controller.dispose();
      motion.current = null;
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      try {
        if (current && button?.hasPointerCapture(current.pointer))
          button.releasePointerCapture(current.pointer);
      } catch {
        /* Capture cleanup must not outlive an interrupted/unmounted control. */
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (
      unavailable ||
      (pendingRelease.current && pendingRelease.current.path !== path)
    )
      cancelPull();
  }, [unavailable, path, cancelPull]);

  useEffect(() => {
    const cancelOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelPull();
    };
    const cancelWhenHidden = () => {
      if (document.visibilityState === "hidden") cancelPull();
    };
    const cancelMultipleTouches = (event: TouchEvent) => {
      if (event.touches.length > 1) cancelPull();
    };
    window.addEventListener("blur", cancelPull);
    window.addEventListener("scroll", cancelPull, { passive: true });
    window.addEventListener("keydown", cancelOnKey);
    document.addEventListener("visibilitychange", cancelWhenHidden);
    document.addEventListener("touchstart", cancelMultipleTouches, {
      passive: true,
    });
    return () => {
      window.removeEventListener("blur", cancelPull);
      window.removeEventListener("scroll", cancelPull);
      window.removeEventListener("keydown", cancelOnKey);
      document.removeEventListener("visibilitychange", cancelWhenHidden);
      document.removeEventListener("touchstart", cancelMultipleTouches);
    };
  }, [cancelPull]);

  const movePull = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const sample = (point: { clientX: number; clientY: number }) => {
      current.state = updateBrandPull(
        current.state,
        point.clientX - current.x,
        point.clientY - current.y,
        current.thresholds,
      );
    };
    try {
      for (const point of event.nativeEvent.getCoalescedEvents?.() ?? [])
        if (point.pointerId === current.pointer) sample(point);
    } catch {
      /* Browsers without coalesced samples still deliver the current point. */
    }
    sample(event);
    const state = current.state;
    suppressClick.current ||= state.moved;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    // Early visual feedback does not change the reducer's tap/slop or release guard.
    const tentative = state.action ?? getBrandPullAction(dx, dy);
    const distance = state.moved
      ? state.distance
      : Math.max(
          0,
          tentative === "today" ? dx : tentative === "refresh" ? dy : 0,
        );
    const offset = brandPullOffset(distance);
    const threshold = getBrandPullThreshold(tentative, current.thresholds);
    const armed = Boolean(state.lockedAction) && state.distance >= threshold;
    motion.current?.to(
      {
        // Readiness changes scale and decoration, never the held position.
        x: Math.min(
          84,
          current.origin.x + (tentative === "today" ? offset : 0),
        ),
        y: Math.min(
          84,
          current.origin.y + (tentative === "refresh" ? offset : 0),
        ),
        progress: Math.min(1, distance / threshold),
      },
      true,
      armed,
      tentative,
      distance / BRAND_REFRESH_THRESHOLD,
    );
    const next = {
      action: state.action,
      // Keep the last wording stable while a neutral/released hint fades away.
      feedbackAction: state.action ?? previewRef.current.feedbackAction,
      lockedAction: state.lockedAction,
      ready: armed,
      visible: state.distance > BRAND_REFRESH_SLOP,
    };
    const before = previewRef.current;
    if (next.ready && !before.ready) playBurst("ready");
    if (
      next.action !== before.action ||
      next.feedbackAction !== before.feedbackAction ||
      next.lockedAction !== before.lockedAction ||
      next.ready !== before.ready ||
      next.visible !== before.visible
    ) {
      previewRef.current = next;
      setPreview(next);
    }
  };

  const goToToday = () => {
    if (unavailable) return;
    workspace.rememberDestination("/");
    router.push("/", { scroll: true });
  };

  const releasePull = (committed: BrandPullAction | "home") => {
    if (unavailable || pendingRelease.current) return;
    const pending = {
      action: committed,
      path,
      timer: null as ReturnType<typeof setTimeout> | null,
    };
    pendingRelease.current = pending;
    const finish = () => {
      // A newer gesture, route change or interruption invalidates this callback.
      if (pendingRelease.current !== pending) return;
      pendingRelease.current = null;
      setReleasing(false);
      settlePull();
      if (committed === "refresh") refreshPage();
      else if (committed === "today") goToToday();
      else playBurst("home");
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    setReleasing(true);
    playBurst("release");
    // Let the held icon compress, expand and settle before the page handoff.
    pending.timer = setTimeout(finish, 600);
  };

  return (
    <div
      ref={surface}
      className={`brand-refresh relative flex items-center justify-center ${styles.root}`}
      style={getBrandThemeStyle()}
      data-rollback={burst?.kind === "home" || undefined}
      data-dragging={dragging}
      data-releasing={releasing}
      data-ready={(dragging || releasing) && ready}
      data-pull-action={dragging ? (action ?? undefined) : undefined}
      data-pull-locked={lockedAction ?? undefined}
      onPointerDown={(event) => {
        if (!event.isPrimary || gesture.current) {
          cancelPull();
          return;
        }
        if (event.button !== 0 || unavailable || pendingRelease.current) return;
        // Reset decorative clocks once per fresh pull, never the captured handle.
        setChargeSession((session) => session + 1);
        suppressClick.current = false;
        const reset = {
          ...previewRef.current,
          action: null,
          lockedAction: null,
          ready: false,
          visible: false,
        };
        previewRef.current = reset;
        setPreview(reset);
        gesture.current = {
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          origin: motion.current?.hold() ?? { x: 0, y: 0 },
          thresholds: getBrandPullThresholds(
            event.clientX,
            event.clientY,
            window.visualViewport
              ? window.visualViewport.offsetLeft + window.visualViewport.width
              : window.innerWidth,
            window.visualViewport
              ? window.visualViewport.offsetTop + window.visualViewport.height
              : window.innerHeight,
          ),
          state: {
            moved: false,
            action: null,
            lockedAction: null,
            distance: 0,
          },
        };
        try {
          handle.current?.setPointerCapture(event.pointerId);
        } catch {
          cancelPull();
          return;
        }
        setDragging(true);
      }}
      onPointerMove={movePull}
      onPointerUp={(event) => {
        const current = gesture.current;
        if (!current || current.pointer !== event.pointerId) return;
        // Final coordinates can cross a threshold even without a final move event.
        movePull(event);
        const released = current.state;
        const committed = getBrandPullRelease(
          released,
          path,
          current.thresholds,
        );
        endPull(false, Boolean(committed) && !unavailable);
        if (committed) releasePull(committed);
      }}
      onPointerCancel={(event) => {
        if (gesture.current?.pointer === event.pointerId) cancelPull();
      }}
      onLostPointerCapture={(event) => {
        if (gesture.current?.pointer === event.pointerId) cancelPull();
      }}
    >
      <button
        ref={handle}
        type="button"
        className={`header-icon-button header-icon-button--compact header-brand-surface header-refresh-button brand-refresh-handle ${styles.button}`}
        aria-label="Refresh this page"
        title="Refresh this page"
        aria-describedby={hintId}
        disabled={unavailable || releasing}
        data-brand-refresh
        onClick={refreshPage}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current || unavailable || pendingRelease.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (pendingRelease.current) {
            if (event.key !== "Escape") event.preventDefault();
            return;
          }
          // A cancelled pointer gesture must not consume a later keyboard tap.
          suppressClick.current = false;
        }}
      >
        <BrandMark ref={mark} className={`size-6 ${styles.pills}`} />
        <span
          key={chargeSession}
          className={styles.feedback}
          data-brand-pull-feedback
          aria-hidden="true"
        >
          <span className={styles.face}>
            <span className={styles.edge} />
          </span>
          <span className={styles.chargedGlow} />
          <span className={styles.orbit} data-brand-charge-rings>
            <span className={styles.orbitTrack} />
            <span className={styles.orbitRibbon} />
            <span className={styles.orbitCounter} />
            <span className={styles.orbitBead} />
          </span>
          <span className={styles.light} />
          <span className={styles.glyph} data-brand-pull-icon>
            <span className={styles.actionGlyph}>
              <span className={styles.chargedRotor} data-brand-charge-rotor>
                <RefreshCcw
                  strokeWidth={2.65}
                  data-brand-action-symbol="refresh-ccw"
                />
              </span>
            </span>
          </span>
          <svg
            className={styles.innerPop}
            viewBox="0 0 46 46"
            fill="none"
            focusable="false"
          >
            <circle cx="9" cy="12" r="1.7" fill="var(--brand-copy)" />
            <circle cx="36" cy="14" r="1.4" fill="var(--brand-copy)" />
            <circle cx="30" cy="36" r="1.7" fill="var(--brand-copy)" />
            <path
              d="m6 28 4-1m22-20 1 4m2 19 4 2"
              stroke="var(--brand-copy)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {burst && (
        <span
          key={`${burst.kind}-${burst.sequence}`}
          className={styles.burst}
          data-kind={burst.kind}
          data-brand-pull-burst
          aria-hidden="true"
        >
          <span className={styles.wave} />
          <span className={styles.echo} />
          <span className={styles.shock} />
          <svg
            className={styles.rays}
            viewBox="0 0 64 64"
            fill="none"
            focusable="false"
          >
            <path d="M32 3v8" />
            <path d="M32 53v8" />
            <path d="M3 32h8" />
            <path d="M53 32h8" />
            <path d="m11.5 11.5 5.7 5.7" />
            <path d="m46.8 46.8 5.7 5.7" />
            <path d="m52.5 11.5-5.7 5.7" />
            <path d="m17.2 46.8-5.7 5.7" />
          </svg>
          {Array.from({ length: 18 }, (_, index) => {
            const angle = ((index * 20 + burst.sequence * 13) * Math.PI) / 180;
            const reach = 44 + (index % 4) * 9;
            return (
              <span
                key={index}
                className={styles.particle}
                data-shape={index % 4}
                style={
                  {
                    "--particle-x": `${(Math.cos(angle) * reach).toFixed(2)}px`,
                    "--particle-y": `${(Math.sin(angle) * reach).toFixed(2)}px`,
                    "--particle-turn": `${75 + index * 37}deg`,
                    "--particle-delay": `${(index % 3) * 24}ms`,
                    "--particle-color": [
                      "var(--brand-copy)",
                      "var(--brand-tone-pale)",
                      "var(--brand-tone-teal)",
                      "var(--brand-tone-seafoam)",
                      "var(--brand-copy)",
                      "var(--brand-tone-ice)",
                      "var(--brand-tone-emerald)",
                    ][index % 7],
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      )}
      <span id={hintId} className="sr-only">
        Tap to refresh this page. Pull down and release to refresh, or pull
        right and release to return to Today. You can change direction until the
        refresh icon springs outward and its rings light up; that threshold
        locks the direction. Pull back to cancel. Today is also available in
        navigation.
      </span>
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {releasing
          ? feedbackAction === "today"
            ? "Returning to Today…"
            : "Refreshing…"
          : burst?.kind === "home"
            ? "You are already on Today."
            : visible
              ? feedbackAction === "today"
                ? ready
                  ? "Release to open Today."
                  : "Pull right to open Today."
                : ready
                  ? "Release to refresh."
                  : "Pull down to refresh."
              : ""}
      </span>
    </div>
  );
}
