"use client";

import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCheck,
  ClockFading,
  ListFilter,
  ChevronsUp,
  CloudDownload,
  History as RotateCcwClock,
  Database,
  Info,
  LoaderCircle,
  Minimize2,
  MoonStar,
  PillBottle,
  RefreshCcw,
  ShieldCheck,
  Target,
  Undo2,
  X,
} from "lucide-react";
import type { Action, ExternalToast } from "sonner";
import {
  NOTIFICATION_COLLAPSE_EVENT,
  ToastSymbol,
  useNotificationStack,
  type NotificationCollapseDetail,
} from "@/components/ui/sonner";
import { NotificationCountdownBadge } from "@/components/ui/notification-countdown-badge";
import { NotificationStatusBadge } from "@/components/ui/notification-status-badge";
import { NotificationPullIndicator } from "@/components/ui/notification-pull-indicator";
import { useNotificationPull } from "@/components/ui/use-notification-pull";
import { NotificationChangePreview } from "@/components/notification-change-preview";
import { NotificationUnchanged } from "@/components/ui/notification-unchanged";
import { NotificationContext } from "@/components/ui/notification-context";
import unchangedStyles from "./notification-unchanged.module.css";
import type { NotificationChangePreview as NotificationChangePreviewData } from "@/lib/notification-change-preview";
import type { JournalToastKind } from "@/components/ui/journal-toast";
import {
  NOTIFICATION_EXIT_TIMING,
  NOTIFICATION_UPDATE_EXIT_TIMING,
  NotificationClock,
  settleNotificationUndo,
  type NotificationExitReason,
  type NotificationId,
} from "@/lib/journal-notification-lifecycle";
import { Button } from "@/components/ui/button";
import { notificationVisibilityAfterBatch } from "@/lib/notification-admission";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TodayActionButton } from "@/components/today-action-button";
import { getIntakeActionThemeStyle } from "@/lib/action-button-system";
import { isIntakeReceipt } from "@/lib/intake-receipt";
import {
  nextNotificationWake,
  NOTIFICATION_CHECKPOINT_INTERVAL,
} from "@/lib/notification-scheduling";

export type JournalNotificationDetails = {
  /** Display-only snapshots of the actual affected records, never live editors. */
  preview?: NotificationChangePreviewData;
  paragraphs?: ReactNode[];
  facts?: { label: ReactNode; value: ReactNode }[];
  links?: { label: string; href: string }[];
  footer?: ReactNode;
};

export type JournalNotificationUndo = {
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  onUndo: () => Promise<void> | void;
  /** Original server expiry; stored only in the current journal namespace. */
  receipt?: { token: string; expiresAt: string };
};

export type JournalNotificationProps = {
  id: NotificationId;
  nativeHostId?: string;
  kind: JournalToastKind;
  heading: ReactNode;
  message: ReactNode;
  duration: number;
  readingClock?: NotificationClock;
  onCheckpoint?: () => void;
  onUndoPending?: (pending: boolean) => void;
  details?: JournalNotificationDetails;
  undo?: JournalNotificationUndo;
  variant?: "intake-saved" | "unchanged";
  icon?: ReactNode;
  dismissible: boolean;
  action?: ExternalToast["action"];
  cancel?: ExternalToast["cancel"];
  actionButtonStyle?: CSSProperties;
  cancelButtonStyle?: CSSProperties;
  registerExit: (
    exit: (reason: NotificationExitReason) => void,
    cancel: () => void,
  ) => () => void;
  onRequestDismiss: (reason: NotificationExitReason) => void;
  onExitComplete: (reason: NotificationExitReason) => void;
  isCurrent: () => boolean;
  onDetachedUndoFailure: (error: unknown) => void;
};

const defaultFooter: Record<JournalToastKind, string> = {
  success: "Saved in your journal.",
  error: "Your unsaved draft stays available.",
  info: "Your journal, at a glance.",
  warning: "A moment to check the details.",
  loading: "This notice updates when the action finishes.",
  update: "Saved records and drafts stay in your journal.",
};

function linkPresentation(href: string, label: string) {
  if (/^\/medications(?:[/?#]|$)/.test(href))
    return { Icon: PillBottle, caption: "Medication" };
  if (/^\/history\//.test(href)) {
    if (/[?&]intake=/.test(href))
      return { Icon: BookOpenText, caption: "Entry" };
    if (/[?&]checkin=/.test(href))
      return { Icon: MoonStar, caption: "Check-In" };
    return { Icon: CalendarDays, caption: "Day" };
  }
  if (/^\/history(?:[?#]|$)/.test(href))
    return { Icon: CalendarDays, caption: "Past Days" };
  if (/^\/goals(?:[/?#]|$)/.test(href))
    return { Icon: Target, caption: "Goals" };
  if (/^\/(?:developer-guide|guide)(?:[/?#]|$)/.test(href))
    return { Icon: BookOpenText, caption: "Guide" };
  if (href === "/" || /^\/journal(?:[/?#]|$)/.test(href))
    return { Icon: BookOpenText, caption: href === "/" ? "Today" : "Journal" };
  return { Icon: ArrowUpRight, caption: label };
}

function isAction(value: ExternalToast["action"]): value is Action {
  return Boolean(
    value &&
    typeof value === "object" &&
    !isValidElement(value) &&
    "onClick" in value,
  );
}

/** Content owns reading and exit choreography; the native Sonner li owns stacking/swipes. */
export function JournalNotification({
  id,
  nativeHostId,
  kind,
  heading,
  message,
  duration,
  readingClock: suppliedClock,
  onCheckpoint,
  onUndoPending,
  details,
  undo,
  variant,
  icon,
  dismissible,
  action,
  cancel,
  actionButtonStyle,
  cancelButtonStyle,
  registerExit,
  onRequestDismiss,
  onExitComplete,
  isCurrent,
  onDetachedUndoFailure,
}: JournalNotificationProps) {
  const root = useRef<HTMLDivElement>(null);
  const pullIndicator = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const [initialReading] = useState(() =>
    (suppliedClock ?? new NotificationClock(duration)).snapshot(),
  );
  const [counter, setCounter] = useState<{
    seconds: number | null;
    remainingMs: number;
    paused: boolean;
    hidden: boolean;
  }>({
    seconds:
      !initialReading.complete && initialReading.timeUntilComplete <= 3_000
        ? Math.max(1, Math.ceil(initialReading.timeUntilComplete / 1_000))
        : null,
    remainingMs: initialReading.timeUntilComplete,
    paused: true,
    hidden: true,
  });
  const clock = useRef<NotificationClock | null>(null);
  const refreshClock = useRef<() => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(false);
  const leaving = useRef(false);
  const expandedRef = useRef(false);
  const heldPointers = useRef(
    new Map<
      number,
      { x: number; y: number; startedAt: number; target: Element | null }
    >(),
  );
  const suppressClick = useRef(false);
  // Individual native clicks may arrive before the last touch has released.
  const heldGesture = useRef(false);
  const pauseReasons = useRef(new Set<string>());
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [reversed, setReversed] = useState(false);
  const [undoState, setUndoState] = useState<"ready" | "pending" | "done">(
    "ready",
  );
  const [undoError, setUndoError] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyId = useId();
  const detailsId = useId();
  const headingId = useId();
  const messageId = useId();
  const stack = useNotificationStack();
  const needsStackReveal = stack.count > 1 && !stack.expanded;

  useLayoutEffect(() => {
    // StrictMode can retire a native host before its custom child ever mounts.
    // Fence that late child before paint as well as hiding already-mounted ones.
    if (isCurrent() || !root.current) return;
    root.current.style.visibility = "hidden";
    root.current.inert = true;
  }, [isCurrent]);

  useLayoutEffect(() => {
    const card = root.current;
    const details = document.getElementById(detailsId);
    if (!expanded || !card || !details || stack.expanded) return;
    const measure = () => {
      const top =
        details.getBoundingClientRect().top -
        (window.visualViewport?.offsetTop ?? 0);
      card.style.setProperty("--details-viewport-top", `${top}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    const header = card.querySelector(".journal-notification-header");
    if (header) observer.observe(header);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    card.addEventListener("transitionend", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      card.removeEventListener("transitionend", measure);
    };
  }, [expanded, detailsId, stack.expanded]);

  const pause = useCallback((reason: string, value: boolean) => {
    if (value) pauseReasons.current.add(reason);
    else pauseReasons.current.delete(reason);
    clock.current?.pause(reason, value);
    refreshClock.current();
  }, []);

  const blurHeldFocus = useCallback(() => {
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      root.current?.contains(focused) &&
      !focused.matches(":focus-visible")
    )
      focused.blur();
  }, []);

  const cancelNativeSwipe = useCallback((pointerId = -1) => {
    const host = root.current?.closest<HTMLElement>("[data-sonner-toast]");
    if (
      !host ||
      host.dataset.removed === "true" ||
      host.dataset.swipeOut === "true"
    )
      return;
    // Sonner has drag-end cleanup but no pointer-cancel handler. End the drag
    // without sending a pointer-up through the toast's swipe-to-dismiss path.
    host.style.setProperty("--swipe-amount-x", "0px");
    host.style.setProperty("--swipe-amount-y", "0px");
    host.dispatchEvent(new Event("dragend", { bubbles: true }));
    host
      .closest("[data-sonner-toaster]")
      ?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId }),
      );
  }, []);

  const releasePointer = useCallback(
    (
      event: Pick<PointerEvent, "pointerId" | "clientX" | "clientY" | "type">,
    ) => {
      const start = heldPointers.current.get(event.pointerId);
      if (!start) return;
      const heldOrMoved =
        event.type === "pointercancel" ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
        performance.now() - start.startedAt >= 350;
      if (heldOrMoved) {
        heldGesture.current = true;
        suppressClick.current = true;
      }
      heldPointers.current.delete(event.pointerId);
      pause("pointer", heldPointers.current.size > 0);
      if (heldGesture.current && heldPointers.current.size === 0) {
        suppressClick.current = true;
        blurHeldFocus();
      }
      if (event.type === "pointercancel" && heldPointers.current.size === 0)
        cancelNativeSwipe(event.pointerId);
    },
    [pause, blurHeldFocus, cancelNativeSwipe],
  );

  const clearPointers = useCallback(() => {
    const hadPointers = heldPointers.current.size > 0;
    if (hadPointers) {
      heldGesture.current = true;
      suppressClick.current = true;
      blurHeldFocus();
      for (const [pointerId, held] of heldPointers.current) {
        try {
          if (held.target?.hasPointerCapture(pointerId))
            held.target.releasePointerCapture(pointerId);
        } catch {
          // The captured element may have detached during an interrupted gesture.
        }
      }
    }
    heldPointers.current.clear();
    pause("pointer", false);
    if (hadPointers) cancelNativeSwipe();
  }, [pause, blurHeldFocus, cancelNativeSwipe]);

  useEffect(() => {
    alive.current = true;
    leaving.current = false;
    const element = root.current;
    const outer = element?.closest<HTMLElement>("[data-sonner-toast]");
    if (!element) return;
    const readingClock = suppliedClock ?? new NotificationClock(duration);
    clock.current = readingClock;
    for (const reason of pauseReasons.current) readingClock.pause(reason, true);
    const setPause = (reason: string, value: boolean) => {
      if (value) pauseReasons.current.add(reason);
      else pauseReasons.current.delete(reason);
      readingClock.pause(reason, value);
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastCheckpoint = -Infinity;
    let paintedProgress = -1;
    let paintedUrgency = -1;
    let disposed = false;
    let inViewport = false;
    let fullyVisible = false;
    let readyToRead = false;
    let entered = false;
    const visibleHeader = element.querySelector(".journal-notification-header");
    const flag = (name: string, value: string | boolean) => {
      const next = String(value);
      if (element.dataset[name] !== next) element.dataset[name] = next;
    };
    const tick = () => {
      clearTimeout(timer);
      if (disposed) return;
      const snapshot = readingClock.snapshot();
      const hidden = element.dataset.motionPaused === "true";
      flag("paused", snapshot.paused);
      flag("countdownComplete", snapshot.complete);
      flag(
        "progressPhase",
        snapshot.complete
          ? "complete"
          : snapshot.timeUntilComplete <= 3_000
            ? "final"
            : snapshot.progress > 0.6
              ? "start"
              : "middle",
      );
      // The progress rail is the only continuously changing paint. Scaling it
      // avoids layout and keeps inherited card variables out of the hot path.
      const bar = progress.current;
      if (!hidden && bar) {
        if (paintedProgress !== snapshot.progress) {
          bar.style.transform = `scaleX(${snapshot.progress})`;
          paintedProgress = snapshot.progress;
        }
        if (paintedUrgency !== snapshot.colorUrgency) {
          bar.style.setProperty(
            "--notification-urgency",
            String(snapshot.colorUrgency),
          );
          paintedUrgency = snapshot.colorUrgency;
        }
      }
      const timerHidden = hidden || !readyToRead;
      const seconds =
        !timerHidden &&
        !snapshot.complete &&
        snapshot.timeUntilComplete <= 3_000
          ? Math.max(1, Math.ceil(snapshot.timeUntilComplete / 1_000))
          : null;
      setCounter((previous) =>
        previous.seconds === seconds &&
        previous.paused === snapshot.paused &&
        previous.hidden === timerHidden
          ? previous
          : {
              seconds,
              remainingMs: snapshot.timeUntilComplete,
              paused: snapshot.paused,
              hidden: timerHidden,
            },
      );
      const now = performance.now();
      if (
        Number.isFinite(duration) &&
        now - lastCheckpoint >= NOTIFICATION_CHECKPOINT_INTERVAL
      ) {
        lastCheckpoint = now;
        onCheckpoint?.();
      }
      if (snapshot.expired && !leaving.current && isCurrent()) {
        leaving.current = true;
        onRequestDismiss("timeout");
      }
      const delay = nextNotificationWake(snapshot, !hidden);
      if (delay !== null && !leaving.current) timer = setTimeout(tick, delay);
    };
    const syncNative = () => {
      if (disposed) return;
      flag(
        "motionPaused",
        !inViewport ||
          document.hidden ||
          (outer?.dataset.front === "false" &&
            outer?.dataset.expanded === "false") ||
          outer?.dataset.mounted === "false" ||
          outer?.dataset.visible === "false",
      );
      setPause("hidden", document.hidden);
      if (document.hidden) clearPointers();
      // Clipped cards spend no reading time; only the latest complete view
      // from the observer batch can resume the monotonic countdown.
      if (!entered && outer?.dataset.mounted === "true")
        entered = Number(getComputedStyle(outer).opacity) >= 0.999;
      readyToRead = fullyVisible && entered && !document.hidden;
      flag("fullyVisible", fullyVisible);
      flag("readingVisible", readyToRead);
      setPause(
        "not-visible",
        !readyToRead || outer?.dataset.visible === "false",
      );
      setPause("unmounted", outer?.dataset.mounted !== "true");
      if (outer?.dataset.removed === "true") {
        setPause("removed", true);
        setReversed(true);
      }
      tick();
    };
    const observer = new MutationObserver(syncNative);
    if (outer)
      observer.observe(outer, {
        attributes: true,
        attributeFilter: [
          "data-front",
          "data-expanded",
          "data-mounted",
          "data-visible",
          "data-removed",
        ],
      });
    const intersection = new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        // A rapid insertion can deliver several positions for the same card
        // together. Consume the entire batch; its last position is authoritative.
        const next = notificationVisibilityAfterBatch(
          { fullyVisible, headerVisible: inViewport },
          entries,
          element,
          visibleHeader ?? undefined,
        );
        fullyVisible = next.fullyVisible;
        inViewport = next.headerVisible;
        syncNative();
      },
      { threshold: [0, 1] },
    );
    intersection.observe(element);
    if (visibleHeader) intersection.observe(visibleHeader);
    const enteredFrame = (event: TransitionEvent) => {
      if (event.target === outer && event.propertyName === "opacity")
        syncNative();
    };
    outer?.addEventListener("transitionend", enteredFrame);
    outer?.addEventListener("transitioncancel", enteredFrame);
    document.addEventListener("visibilitychange", syncNative);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("blur", clearPointers);
    refreshClock.current = tick;
    syncNative();
    return () => {
      alive.current = false;
      observer.disconnect();
      intersection.disconnect();
      outer?.removeEventListener("transitionend", enteredFrame);
      outer?.removeEventListener("transitioncancel", enteredFrame);
      document.removeEventListener("visibilitychange", syncNative);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("blur", clearPointers);
      disposed = true;
      clearTimeout(timer);
      if (refreshClock.current === tick) refreshClock.current = () => {};
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
      clock.current = null;
    };
  }, [
    duration,
    suppliedClock,
    onCheckpoint,
    isCurrent,
    onRequestDismiss,
    releasePointer,
    clearPointers,
  ]);

  useEffect(() => {
    let removeAnimationEnd = () => {};
    const clear = () => {
      removeAnimationEnd();
      removeAnimationEnd = () => {};
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    };
    const later = (callback: () => void, delay: number) => {
      timers.current.push(
        setTimeout(() => {
          if (alive.current && isCurrent()) callback();
        }, delay),
      );
    };
    const detach = registerExit((reason) => {
      clear();
      leaving.current = true;
      pauseReasons.current.add("leaving");
      clock.current?.pause("leaving", true);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const hadDetails = expandedRef.current;
      expandedRef.current = false;
      setPolicyOpen(false);
      setExpanded(false);
      setPhase(hadDetails ? "collapsing" : "anticipate");
      const beginExit = () => {
        const card = root.current;
        const bounds = card?.getBoundingClientRect();
        if (kind === "update" && reason === "action") {
          if (bounds && card) {
            card.style.setProperty(
              "--notification-update-exit-x",
              `${Math.max(window.innerWidth - bounds.left + 96, bounds.width + 160)}px`,
            );
            card.style.setProperty(
              "--notification-update-exit-y",
              `${-Math.min(200, Math.max(80, bounds.height * 1.4))}px`,
            );
            card.style.setProperty(
              "--notification-update-exit-duration",
              `${NOTIFICATION_UPDATE_EXIT_TIMING.launch}ms`,
            );
          }
          let completed = false;
          const complete = () => {
            if (completed) return;
            completed = true;
            clear();
            if (alive.current && isCurrent()) onExitComplete(reason);
          };
          const onAnimationEnd = (event: AnimationEvent) => {
            if (
              event.target === card &&
              event.animationName === "journal-notification-update-launch"
            )
              complete();
          };
          if (!reduced && card) {
            card.addEventListener("animationend", onAnimationEnd);
            removeAnimationEnd = () =>
              card.removeEventListener("animationend", onAnimationEnd);
          }
          let extendedForPaint = false;
          const fallback = () => {
            const launch = card
              ?.getAnimations()
              .find(
                (animation) =>
                  "animationName" in animation &&
                  animation.animationName ===
                    "journal-notification-update-launch",
              );
            const elapsed = launch?.currentTime;
            // A busy collapse can defer the first painted frame. Allow one
            // bounded extension rather than cutting off an active launch.
            if (
              !reduced &&
              !extendedForPaint &&
              !document.hidden &&
              launch?.playState === "running" &&
              typeof elapsed === "number" &&
              elapsed < NOTIFICATION_UPDATE_EXIT_TIMING.launch
            ) {
              extendedForPaint = true;
              later(
                complete,
                Math.ceil(NOTIFICATION_UPDATE_EXIT_TIMING.launch - elapsed) +
                  NOTIFICATION_UPDATE_EXIT_TIMING.fallbackGrace,
              );
              return;
            }
            complete();
          };
          setPhase("update-launch");
          later(
            fallback,
            reduced
              ? NOTIFICATION_UPDATE_EXIT_TIMING.reducedDepart
              : NOTIFICATION_UPDATE_EXIT_TIMING.launch +
                  NOTIFICATION_UPDATE_EXIT_TIMING.fallbackGrace,
          );
          return;
        }
        if (bounds)
          root.current?.style.setProperty(
            "--notification-exit-y",
            `${-Math.max(bounds.bottom + 64, bounds.height + 96)}px`,
          );
        setPhase("anticipate");
        // The complete artwork leaves with the card. Native swipes still own
        // their separate reverse; starting it here hid the icon too early.
        later(
          () => {
            setPhase("depart");
            later(
              () => onExitComplete(reason),
              reduced
                ? NOTIFICATION_EXIT_TIMING.reducedDepart
                : NOTIFICATION_EXIT_TIMING.depart,
            );
          },
          reduced ? 0 : NOTIFICATION_EXIT_TIMING.anticipate,
        );
      };
      if (hadDetails)
        later(beginExit, reduced ? 0 : NOTIFICATION_EXIT_TIMING.collapse);
      else beginExit();
    }, clear);
    return () => {
      clear();
      detach();
    };
  }, [isCurrent, kind, onExitComplete, registerExit]);

  const closeDetails = useCallback(() => {
    if (phase !== "idle" || leaving.current || !expandedRef.current) return;
    root.current
      ?.querySelector<HTMLButtonElement>(".journal-notification-summary")
      ?.focus({ preventScroll: true });
    expandedRef.current = false;
    pause("expanded", false);
    setPolicyOpen(false);
    setExpanded(false);
  }, [phase, pause]);

  useEffect(() => {
    const collapseFromBackdrop = (event: Event) => {
      const target = (event as CustomEvent<NotificationCollapseDetail>).detail
        ?.target;
      if (!target || target === root.current) closeDetails();
    };
    window.addEventListener(NOTIFICATION_COLLAPSE_EVENT, collapseFromBackdrop);
    return () =>
      window.removeEventListener(
        NOTIFICATION_COLLAPSE_EVENT,
        collapseFromBackdrop,
      );
  }, [closeDetails]);

  const toggle = () => {
    if (phase !== "idle" || suppressClick.current) return;
    const next = !expandedRef.current;
    expandedRef.current = next;
    pause("expanded", next);
    if (!next) setPolicyOpen(false);
    setExpanded(next);
  };

  useNotificationPull({
    root,
    indicator: pullIndicator,
    enabled: phase === "idle" && undoState !== "pending",
    expanded,
    canStart: (event) => {
      const card = root.current;
      const host = card?.closest<HTMLElement>("[data-sonner-toast]");
      if (
        !isCurrent() ||
        leaving.current ||
        card?.closest('[inert],[aria-hidden="true"]') ||
        (!stack.expanded && host?.dataset.front === "false")
      )
        return false;
      // A list keeps native touch scrolling over its text. The artwork
      // remains a small pull handle; a single card accepts its whole summary.
      // An expanded header also accepts the closing pull; its body stays native.
      return (
        event.type !== "pointerdown" ||
        event.pointerType !== "touch" ||
        expandedRef.current ||
        stack.count <= 1 ||
        !stack.expanded ||
        Boolean(
          event.target instanceof Element &&
          event.target.closest(".journal-notification-art"),
        )
      );
    },
    onExpand: () => {
      if (
        !isCurrent() ||
        leaving.current ||
        phase !== "idle" ||
        expandedRef.current
      )
        return false;
      if (needsStackReveal) stack.reveal();
      expandedRef.current = true;
      pause("expanded", true);
      setExpanded(true);
      return true;
    },
    onCollapse: () => {
      if (
        !isCurrent() ||
        leaving.current ||
        phase !== "idle" ||
        !expandedRef.current
      )
        return false;
      closeDetails();
      return true;
    },
    consumeClick: () => {
      suppressClick.current = true;
      heldGesture.current = true;
    },
    pause: (value) => pause("pull", value),
    resetNative: cancelNativeSwipe,
  });

  const runUndo = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!undo || undoState !== "ready" || leaving.current) return;
    pause("undo", true);
    setUndoError("");
    // Native disabled buttons relinquish focus. Keep keyboard focus in this
    // notification before either Undo control enters its pending state.
    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.matches(
        ".journal-notification-undo, .journal-notification-footer-undo",
      ) &&
      root.current?.contains(document.activeElement)
    )
      root.current
        .querySelector<HTMLButtonElement>(".journal-notification-summary")
        ?.focus({ preventScroll: true });
    setUndoState("pending");
    onUndoPending?.(true);
    try {
      await settleNotificationUndo({
        undo: undo.onUndo,
        isCurrent: () => alive.current && isCurrent() && !leaving.current,
        onSuccess: () => {
          // Undo is available while collapsed; its success beat must outlive
          // even a reading clock that was nearly finished before the click.
          pause("undo-complete", true);
          setUndoState("done");
          timers.current.push(
            setTimeout(() => {
              if (alive.current && isCurrent()) onRequestDismiss("action");
            }, 450),
          );
        },
        onFailure: (error) => {
          setUndoState("ready");
          onUndoPending?.(false);
          setUndoError(
            error instanceof Error
              ? error.message
              : "Couldn’t undo that change. Please try again.",
          );
          expandedRef.current = true;
          pause("expanded", true);
          setExpanded(true);
        },
        onDetachedFailure: onDetachedUndoFailure,
      });
    } finally {
      if (alive.current) pause("undo", false);
    }
  };

  const displayedUndoState = undo ? undoState : "unavailable";
  const renderUndo = (footer = false) => {
    const button = (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={
          footer
            ? "journal-notification-tool journal-notification-footer-undo"
            : "journal-notification-revert journal-notification-undo"
        }
        data-undo-state={displayedUndoState}
        disabled={displayedUndoState !== "ready" || phase !== "idle"}
        aria-busy={displayedUndoState === "pending"}
        aria-label={
          !undo
            ? "Undo unavailable for this notice"
            : undoState === "pending"
              ? (undo.pendingLabel ?? "Undoing change")
              : undoState === "done"
                ? (undo.successLabel ?? "Change undone")
                : (undo.label ?? "Undo change")
        }
        title={
          details?.preview?.after?.kind === "intake" && undo
            ? undefined
            : (undo?.label ??
              (undo ? "Undo change" : "Undo unavailable for this notice"))
        }
        onPointerDown={(event) => event.stopPropagation()}
        onClick={undo ? runUndo : undefined}
      >
        <span className="journal-notification-revert-symbol" aria-hidden="true">
          {displayedUndoState === "pending" ? (
            <LoaderCircle />
          ) : displayedUndoState === "done" ? (
            <Check />
          ) : (
            <Undo2 />
          )}
        </span>
        <span className="journal-notification-revert-label" aria-hidden="true">
          {displayedUndoState === "pending"
            ? "Undoing"
            : displayedUndoState === "done"
              ? "Undone"
              : "Undo"}
        </span>
      </Button>
    );
    if (!undo || details?.preview?.after?.kind !== "intake") return button;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent
            side="top"
            className="journal-intake-undo-hint"
            positionerClassName="journal-notification-tooltip-positioner"
          >
            <span>
              The <strong>Undo</strong> button below{" "}
              {details.preview.before?.kind === "intake"
                ? "restores the previous saved values for this intake."
                : undo.label === "Undo Replacement"
                  ? "restores the original intake and removes this replacement."
                  : "removes only this newly saved intake."}
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const collapseDetails = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    closeDetails();
  };

  const dismissFromFooter = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (phase !== "idle" || leaving.current) return;
    const wasExpanded = expandedRef.current;
    closeDetails();
    timers.current.push(
      setTimeout(
        () => {
          if (alive.current && isCurrent()) onRequestDismiss("dismiss");
        },
        wasExpanded ? 150 : 0,
      ),
    );
  };

  const followRelatedLink = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    )
      collapseDetails(event);
  };

  const renderAction = (
    value: ExternalToast["action"],
    cancelAction = false,
  ) => {
    if (!isAction(value)) return value;
    return (
      <Button
        variant={cancelAction ? "ghost" : "default"}
        size="sm"
        type="button"
        className={`journal-notification-action${cancelAction ? " journal-notification-cancel" : ""} h-auto`}
        style={
          cancelAction
            ? cancelButtonStyle
            : (actionButtonStyle ?? value.actionButtonStyle)
        }
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (leaving.current || (cancelAction && !dismissible)) return;
          value.onClick(event);
          if (cancelAction || !event.defaultPrevented)
            onRequestDismiss(cancelAction ? "cancel" : "action");
        }}
      >
        {value.label}
        {!cancelAction && <ArrowUpRight size={12} aria-hidden="true" />}
      </Button>
    );
  };

  const renderUpdateChoice = (
    value: ExternalToast["action"],
    mode: "now" | "later",
  ) => {
    if (!isAction(value)) return null;
    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (leaving.current) return;
      value.onClick(event);
      if (mode === "later" || !event.defaultPrevented)
        onRequestDismiss(mode === "later" ? "cancel" : "action");
    };
    if (mode === "now")
      return (
        <TodayActionButton
          type="button"
          className="intake-primary-cta journal-update-apply"
          data-intake-paint="satin"
          data-journal-write
          data-update-choice="now"
          radius={16}
          style={{ ...getIntakeActionThemeStyle(), height: 58, minHeight: 58 }}
          disabled={phase !== "idle"}
          aria-label="Apply update now and reload"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClick}
        >
          <span className="journal-update-choice-copy">
            <span className="journal-update-choice-heading">
              <span className="journal-update-choice-label">
                <CheckCheck aria-hidden="true" />
                <span>Apply Now</span>
              </span>
              <ArrowRight className="intake-primary-next" aria-hidden="true" />
            </span>
            <small>Reload into the update</small>
          </span>
        </TodayActionButton>
      );
    return (
      <TodayActionButton
        type="button"
        className="intake-primary-cta journal-update-later"
        data-intake-paint="satin"
        data-update-choice="later"
        radius={16}
        style={{ ...getIntakeActionThemeStyle(), height: 58, minHeight: 58 }}
        disabled={phase !== "idle" || !dismissible}
        aria-label="Update later, when the app closes or reloads"
        title="Keep using this version; update on the next close or reload"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClick}
      >
        <span className="journal-update-choice-copy">
          <span className="journal-update-choice-heading">
            <span className="journal-update-choice-label">
              <ClockFading aria-hidden="true" />
              <span>Later</span>
            </span>
          </span>
          <small>Keep this version</small>
        </span>
      </TodayActionButton>
    );
  };

  const renderUpdateApplyIcon = (footer = false) => {
    if (!isAction(action)) return null;
    return (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={`journal-notification-tool journal-notification-confirm-action ${footer ? "journal-update-footer-action" : "journal-update-header-action"}`}
        data-update-choice={footer ? "footer" : undefined}
        aria-label="Apply update and reload"
        title="Apply update and reload"
        disabled={phase !== "idle"}
        tabIndex={footer && !expanded ? -1 : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (leaving.current) return;
          action.onClick(event);
          if (!event.defaultPrevented) onRequestDismiss("action");
        }}
      >
        <span
          className={
            footer
              ? "journal-notification-revert-symbol"
              : "journal-notification-tool-symbol"
          }
          aria-hidden="true"
        >
          <CheckCheck aria-hidden="true" />
        </span>
        <span
          className={
            footer
              ? "journal-notification-revert-label"
              : "journal-notification-tool-label"
          }
          aria-hidden="true"
        >
          Apply
        </span>
      </Button>
    );
  };

  const renderHeaderAction = () => {
    const acknowledge =
      (kind === "info" || (kind === "success" && !undo && !details?.preview)) &&
      dismissible;
    if (
      acknowledge ||
      (!undo &&
        (kind === "warning" ||
          kind === "error" ||
          kind === "loading" ||
          kind === "info"))
    ) {
      const ActionIcon = acknowledge ? Check : expanded ? Minimize2 : Info;
      const label = acknowledge ? "Okay" : expanded ? "Collapse" : "Details";
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`journal-notification-revert${kind === "info" ? " journal-notification-confirm-action" : ""}`}
          aria-label={label}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (needsStackReveal || !acknowledge) toggle();
            else dismissFromFooter(event);
          }}
        >
          <span
            className="journal-notification-revert-symbol"
            aria-hidden="true"
          >
            <ActionIcon />
          </span>
          <span className="journal-notification-revert-label">{label}</span>
        </Button>
      );
    }
    if (kind !== "update" || !isAction(action)) return renderUndo();
    return renderUpdateApplyIcon();
  };

  const medicationPolicy =
    id === "medication-history-policy" && kind === "info";
  const facts = details?.facts?.slice(0, 4) ?? [];
  function policyCount(key: string, singular: string, plural: string) {
    const value = facts.find((fact) => fact.label === key)?.value;
    const count =
      typeof value === "string" || typeof value === "number"
        ? String(value).match(/^\d+\b/)?.[0]
        : undefined;
    return (
      <small className="journal-policy-count">
        {count ? (
          <>
            <b>{count}</b> {count === "1" ? singular : plural}
          </>
        ) : (
          "Across your journal"
        )}
      </small>
    );
  }

  const unchanged = variant === "unchanged";
  const intakeReceipt = !unchanged && isIntakeReceipt(details?.preview);
  const footerLinks = details?.links;
  const footerCopy = intakeReceipt
    ? undo?.label === "Undo Replacement"
      ? "New medication, new entry. Undo brings back the original intake."
      : "Saved snapshot · Open Entry to review or correct this intake."
    : (details?.footer ?? defaultFooter[kind]);
  const updatePanel = kind === "update" && (
    <section className="journal-update-section" aria-label="Update Details">
      <div className="journal-update-panel">
        <div className="journal-update-intro">
          <CloudDownload aria-hidden="true" />
          <div>
            <div className="journal-update-intro-heading">
              <h4>New Version. Same Journal.</h4>
              <span
                className="journal-update-availability"
                title="The update files are downloaded to this device"
              >
                <Check aria-hidden="true" />
                On device
              </span>
            </div>
            <p>
              The new app files are downloaded and ready. Your entries stay
              right where you left them; this is a refresh for the app, not a
              rewrite of your history. Save any open entry before switching.
            </p>
          </div>
        </div>
      </div>
      <section className="journal-update-handoff" aria-label="Update Timing">
        <header className="journal-update-panel-header">
          <span className="journal-update-panel-title">
            <strong>Ready To Switch</strong>
            <span aria-hidden="true">·</span>
            <span>Draft-Safe</span>
          </span>
          <span
            className="journal-update-stats"
            aria-label="One build, zero records changed"
          >
            <span>
              <strong>1</strong> Build
            </span>
            <span aria-hidden="true">/</span>
            <span>
              <strong>0</strong> Records
            </span>
          </span>
        </header>
        <p className="journal-update-handoff-description">
          All saved up? Apply Now reloads into the new version. Your current
          page will refresh, so finish the thought before freshening the app.
        </p>
        <div
          className="journal-update-choices"
          role="group"
          aria-label="Update Timing"
        >
          {renderUpdateChoice(action, "now")}
          {renderUpdateChoice(cancel, "later")}
        </div>
        <p className="journal-update-handoff-note">
          <strong>Later</strong> keeps this version open. The update takes over
          when you next close or reload the app—no mid-sentence plot twist.
        </p>
      </section>
      <section className="journal-update-notes" aria-label="Update Preflight">
        <header>
          <h5>The Handoff, Unpacked</h5>
          <span>Three things to know</span>
        </header>
        <div className="journal-update-note-list">
          <article className="journal-update-note" data-update-note="files">
            <span className="journal-update-note-icon" aria-hidden="true">
              <RefreshCcw />
            </span>
            <div className="journal-update-note-copy">
              <h6>App Files</h6>
              <p>The new interface is downloaded to this device.</p>
            </div>
            <span className="journal-update-note-status">
              <span>Ready</span>
              <small>On device</small>
            </span>
          </article>
          <article className="journal-update-note" data-update-note="journal">
            <span className="journal-update-note-icon" aria-hidden="true">
              <Database />
            </span>
            <div className="journal-update-note-copy">
              <h6>Your Journal</h6>
              <p>Saved entries stay put. Your history isn’t replaced.</p>
            </div>
            <span className="journal-update-note-status">
              <span>Unchanged</span>
              <small>Saved records</small>
            </span>
          </article>
          <article className="journal-update-note" data-update-note="drafts">
            <span className="journal-update-note-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
            <div className="journal-update-note-copy">
              <h6>Open Drafts</h6>
              <p>Finish and save any open entry before you reload.</p>
            </div>
            <span className="journal-update-note-status">
              <span>Save First</span>
              <small>Before Apply</small>
            </span>
          </article>
        </div>
      </section>
      <p className="journal-update-fine-print">
        Saved entries stay put. Save your draft, then Apply—or choose Later to
        keep writing.
      </p>
    </section>
  );
  return (
    <div
      ref={root}
      className={`journal-notification${unchanged ? ` ${unchangedStyles.notice}` : ""}`}
      data-notification-id={id}
      data-notification-host-id={nativeHostId}
      data-kind={kind}
      data-medication-policy={medicationPolicy || undefined}
      data-variant={variant}
      data-expanded={expanded}
      data-phase={phase}
      data-icon-state={reversed ? "reverse" : "forward"}
      data-paused="true"
      data-motion-paused="true"
      data-timer-mode={Number.isFinite(duration) ? "countdown" : "indefinite"}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") pause("hover", true);
      }}
      onPointerLeave={() => pause("hover", false)}
      onPointerDownCapture={(event) => {
        if (undoState === "pending") event.stopPropagation();
        heldGesture.current = heldPointers.current.size > 0;
        suppressClick.current = heldGesture.current;
        heldPointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
          startedAt: performance.now(),
          target: event.target instanceof Element ? event.target : null,
        });
        pause("pointer", true);
      }}
      onPointerUpCapture={releasePointer}
      onPointerCancelCapture={releasePointer}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
          return;
        }
        // Consume the reveal click before it reaches a summary, Undo or link.
        // Sonner's native hover fan and this explicit reveal are independent of
        // the details panel, so one activation cannot open both at once.
        if (phase === "idle" && needsStackReveal) {
          event.preventDefault();
          event.stopPropagation();
          stack.reveal();
        }
      }}
      onFocusCapture={() => pause("focus", true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          pause("focus", false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ")
          suppressClick.current = false;
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        if (expandedRef.current) {
          closeDetails();
          return;
        }
        if (dismissible && phase === "idle" && undoState !== "pending") {
          onRequestDismiss("dismiss");
          return;
        }
        if (stack.expanded && stack.count > 1) stack.collapse();
      }}
    >
      <div
        className="journal-notification-countdown-arrival"
        aria-hidden="true"
      >
        <div className="journal-notification-countdown">
          <span
            ref={progress}
            className="journal-notification-countdown-bar"
            style={{ transform: `scaleX(${initialReading.progress})` }}
          />
        </div>
      </div>
      <NotificationCountdownBadge
        seconds={counter.seconds}
        remainingMs={counter.remainingMs}
        paused={counter.paused}
        hidden={counter.hidden}
      />
      <span className="journal-notification-closed-wash" aria-hidden="true" />
      <span className="journal-notification-frame" aria-hidden="true" />
      <span className="journal-notification-footer-fade" aria-hidden="true" />
      {kind === "update" && (
        <span className="journal-update-exit-trails" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <NotificationPullIndicator ref={pullIndicator} expanded={expanded} />
      <div className="journal-notification-header">
        <button
          type="button"
          className="journal-notification-summary"
          aria-expanded={expanded}
          aria-controls={needsStackReveal ? undefined : detailsId}
          aria-label={needsStackReveal ? "Show notification stack" : undefined}
          aria-labelledby={needsStackReveal ? undefined : headingId}
          aria-describedby={messageId}
          onClick={toggle}
        >
          <span className="journal-notification-summary-content">
            <span className="journal-notification-art">
              {icon === undefined ? (
                <ToastSymbol
                  kind={kind}
                  variant={variant}
                  reversed={reversed}
                />
              ) : (
                icon
              )}
            </span>
            <span className="journal-notification-copy">
              <span className="journal-toast-heading" id={headingId}>
                <span className="journal-toast-heading-text">{heading}</span>
                <span
                  className="journal-toast-heading-status"
                  data-notification-status={kind}
                >
                  <span
                    className="journal-toast-heading-dot"
                    aria-hidden="true"
                  />
                  <NotificationStatusBadge
                    status={unchanged ? "unchanged" : kind}
                  />
                </span>
              </span>
              <span className="journal-notification-description" id={messageId}>
                {message}
              </span>
            </span>
          </span>
        </button>
        {renderHeaderAction()}
      </div>
      <div
        className="journal-notification-details"
        id={detailsId}
        role={expanded ? "dialog" : "region"}
        aria-modal={expanded || undefined}
        aria-labelledby={headingId}
        aria-hidden={!expanded}
        inert={!expanded}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="journal-notification-details-inner">
          <div className="journal-notification-main">
            {unchanged ? (
              <NotificationUnchanged />
            ) : updatePanel ? (
              updatePanel
            ) : details?.preview ? (
              <NotificationChangePreview
                preview={details.preview}
                canUndo={Boolean(undo)}
                paragraphs={details.paragraphs}
              />
            ) : medicationPolicy ? (
              <section
                className="journal-medication-policy"
                aria-label="How medication edits work"
              >
                <header className="journal-policy-intro">
                  <h3>One edit. The math follows.</h3>
                  <p>
                    Correct a medication in your library and its past entries
                    pick up the change. Your journal handles the arithmetic.
                  </p>
                </header>
                <section className="journal-medication-policy-alert">
                  <header>
                    <RotateCcwClock
                      className="journal-policy-clock"
                      size={17}
                      strokeWidth={2.65}
                      aria-hidden="true"
                    />
                    <h4>History</h4>
                    <span>· &nbsp; Edit Policy</span>
                    {policyCount("Entries", "Entry", "Entries")}
                  </header>
                  <p>
                    Change a strength and each linked dose is recalculated from
                    the quantity you logged. Daily totals for that medication
                    follow suit.
                  </p>
                </section>
                <div
                  className="journal-policy-disclosure"
                  data-open={policyOpen}
                >
                  <div className="journal-policy-reveal" aria-hidden="true">
                    <div>
                      <hr />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="journal-policy-toggle"
                    aria-expanded={policyOpen}
                    aria-controls={policyId}
                    onClick={() => setPolicyOpen(!policyOpen)}
                  >
                    {policyOpen ? (
                      <ChevronsUp size={14} />
                    ) : (
                      <ListFilter size={14} />
                    )}
                    {policyOpen ? "Hide edit details" : "See what changes"}
                  </button>
                  <div
                    className="journal-policy-reveal"
                    id={policyId}
                    aria-hidden={!policyOpen}
                  >
                    <div>
                      <dl className="journal-policy-stats">
                        <div>
                          <dt>
                            <PillBottle />
                            Dose Totals
                          </dt>
                          <dd>
                            {policyCount(
                              "Dose totals",
                              "Medication",
                              "Medications",
                            )}
                          </dd>
                          <dd className="journal-policy-description">
                            Each dose uses the updated strength multiplied by
                            the quantity recorded for that intake. The daily
                            total adds those doses together.
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <BookOpenText />
                            Medication Library
                          </dt>
                          <dd>
                            {policyCount(
                              "Library",
                              "Medication",
                              "Medications",
                            )}
                          </dd>
                          <dd className="journal-policy-description">
                            Rename a medication or change its symbol in the
                            library. Earlier intake cards show the updated name
                            and appearance wherever that medication was logged.
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <NotificationContext
                kind={kind}
                heading={heading}
                message={message}
                details={details}
              />
            )}
          </div>
          {undoError && (
            <p className="journal-notification-error" role="alert">
              {undoError}
            </p>
          )}
          <div className="journal-notification-footer">
            <div
              className="journal-notification-tools"
              role="group"
              aria-label="Related Actions"
            >
              {footerLinks?.map((link) => {
                const { Icon: LinkIcon, caption } = linkPresentation(
                  link.href,
                  link.label,
                );
                return (
                  <a
                    key={link.href}
                    className="journal-notification-tool"
                    href={link.href}
                    aria-label={link.label}
                    title={link.label}
                    tabIndex={expanded ? 0 : -1}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={followRelatedLink}
                  >
                    <span
                      className="journal-notification-tool-symbol"
                      aria-hidden="true"
                    >
                      <LinkIcon />
                    </span>
                    <span
                      className="journal-notification-tool-label"
                      aria-hidden="true"
                    >
                      {caption}
                    </span>
                  </a>
                );
              })}
              {kind !== "info" &&
                (undo || (kind === "success" && Boolean(details?.preview))) &&
                renderUndo(true)}
              {kind === "update" && renderUpdateApplyIcon(true)}
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="journal-notification-tool"
                aria-label="Collapse notification details"
                title="Collapse details"
                disabled={phase !== "idle"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={collapseDetails}
              >
                <span
                  className="journal-notification-tool-symbol"
                  aria-hidden="true"
                >
                  <Minimize2 />
                </span>
                <span
                  className="journal-notification-tool-label"
                  aria-hidden="true"
                >
                  Collapse
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="journal-notification-tool journal-notification-dismiss"
                aria-label="Dismiss notification"
                title="Dismiss notification"
                disabled={phase !== "idle" || undoState === "pending"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={dismissFromFooter}
              >
                <span
                  className="journal-notification-tool-symbol"
                  aria-hidden="true"
                >
                  <X />
                </span>
                <span
                  className="journal-notification-tool-label"
                  aria-hidden="true"
                >
                  Dismiss
                </span>
              </Button>
            </div>
            {(medicationPolicy || kind === "update" || intakeReceipt) && (
              <span className="journal-notification-footer-copy">
                {footerCopy}
              </span>
            )}
            {kind !== "update" && (cancel || action) && (
              <span className="journal-notification-actions">
                {renderAction(cancel, true)}
                {renderAction(action)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
