"use client";

import Link from "next/link";
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
  BookOpenText,
  CalendarDays,
  Check,
  Clock3,
  CloudDownload,
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
} from "@/components/ui/sonner";
import { NotificationCountdownBadge } from "@/components/ui/notification-countdown-badge";
import { NotificationStatusBadge } from "@/components/ui/notification-status-badge";
import { NotificationChangePreview } from "@/components/notification-change-preview";
import type { NotificationChangePreview as NotificationChangePreviewData } from "@/lib/notification-change-preview";
import type { JournalToastKind } from "@/components/ui/journal-toast";
import {
  NOTIFICATION_EXIT_TIMING,
  NotificationClock,
  settleNotificationUndo,
  type NotificationExitReason,
  type NotificationId,
} from "@/lib/journal-notification-lifecycle";
import { Button } from "@/components/ui/button";

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
  variant?: "intake-saved";
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

const defaultContext: Record<JournalToastKind, string> = {
  success: "The change is saved in your journal.",
  error:
    "The change wasn’t confirmed. Your unsaved inputs stay in their draft.",
  info: "Review the notice above for the latest journal update.",
  warning: "Review this notice before continuing.",
  loading:
    "The action is still running. This notice will update when it finishes.",
  update: "Finish your current entry before reloading to the new version.",
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
  const progress = useRef<HTMLSpanElement>(null);
  const [initialReading] = useState(() =>
    (suppliedClock ?? new NotificationClock(duration)).snapshot(),
  );
  const [counter, setCounter] = useState<{
    seconds: number | null;
    paused: boolean;
    hidden: boolean;
  }>({
    seconds:
      !initialReading.complete && initialReading.timeUntilComplete <= 3_000
        ? Math.max(1, Math.ceil(initialReading.timeUntilComplete / 1_000))
        : null,
    paused: true,
    hidden: true,
  });
  const clock = useRef<NotificationClock | null>(null);
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

  const pause = useCallback((reason: string, value: boolean) => {
    if (value) pauseReasons.current.add(reason);
    else pauseReasons.current.delete(reason);
    clock.current?.pause(reason, value);
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
    const syncNative = () => {
      element.dataset.motionPaused = String(
        document.hidden ||
          (outer?.dataset.front === "false" &&
            outer?.dataset.expanded === "false") ||
          outer?.dataset.mounted === "false" ||
          outer?.dataset.visible === "false",
      );
      setPause("hidden", document.hidden);
      if (document.hidden) clearPointers();
      // Each mounted notice owns its lifetime, even behind the visible stack.
      setPause("unmounted", outer?.dataset.mounted === "false");
      if (outer?.dataset.removed === "true") {
        setPause("removed", true);
        setReversed(true);
      }
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
    document.addEventListener("visibilitychange", syncNative);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("blur", clearPointers);
    syncNative();
    let pulseAnimations: CSSAnimation[] = [];
    const tick = () => {
      const snapshot = readingClock.snapshot();
      element.style.setProperty(
        "--notification-remaining",
        String(snapshot.progress),
      );
      element.dataset.paused = String(snapshot.paused);
      element.dataset.countdownComplete = String(snapshot.complete);
      element.style.setProperty(
        "--notification-urgency",
        String(snapshot.colorUrgency),
      );
      element.style.setProperty(
        "--notification-pulse-urgency",
        String(snapshot.pulseUrgency),
      );
      element.style.setProperty(
        "--notification-card-urgency",
        String(snapshot.cardUrgency),
      );
      // Keep pulse phase intact while urgency accelerates, rather than repeatedly
      // changing CSS duration and jumping its current pose.
      // A live reduced-motion change cancels CSS animations; rediscover the new
      // instances if motion is enabled again during this countdown.
      if (pulseAnimations.some((animation) => animation.playState === "idle"))
        pulseAnimations = [];
      if (!pulseAnimations.length && snapshot.pulseUrgency > 0)
        pulseAnimations = element
          .getAnimations({ subtree: true })
          .filter(
            (animation): animation is CSSAnimation =>
              typeof CSSAnimation !== "undefined" &&
              animation instanceof CSSAnimation &&
              [
                "journal-notification-countdown-pulse",
                "journal-notification-card-breathe",
              ].includes(animation.animationName),
          );
      for (const animation of pulseAnimations)
        animation.updatePlaybackRate(
          1 + snapshot.pulseUrgency * (1400 / 450 - 1),
        );
      element.dataset.progressPhase = snapshot.complete
        ? "complete"
        : snapshot.timeUntilComplete <= 3_000
          ? "final"
          : snapshot.progress > 0.6
            ? "start"
            : "middle";
      const seconds =
        !snapshot.complete && snapshot.timeUntilComplete <= 3_000
          ? Math.max(1, Math.ceil(snapshot.timeUntilComplete / 1_000))
          : null;
      const hidden = element.dataset.motionPaused === "true";
      setCounter((previous) =>
        previous.seconds === seconds &&
        previous.paused === snapshot.paused &&
        previous.hidden === hidden
          ? previous
          : { seconds, paused: snapshot.paused, hidden },
      );
      onCheckpoint?.();
      if (progress.current)
        progress.current.style.inlineSize = `${snapshot.progress * 100}%`;
      if (snapshot.expired && !leaving.current && isCurrent()) {
        leaving.current = true;
        onRequestDismiss("timeout");
      }
    };
    const interval = setInterval(tick, 50);
    tick();
    return () => {
      alive.current = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncNative);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("blur", clearPointers);
      clearInterval(interval);
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
    const clear = () => {
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
      setExpanded(false);
      setPhase(hadDetails ? "collapsing" : "anticipate");
      const beginExit = () => {
        const bounds = root.current?.getBoundingClientRect();
        if (bounds)
          root.current?.style.setProperty(
            "--notification-exit-y",
            `${-Math.max(bounds.bottom + 64, bounds.height + 96)}px`,
          );
        setPhase("anticipate");
        setReversed(true);
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
  }, [isCurrent, onExitComplete, registerExit]);

  const closeDetails = useCallback(() => {
    if (phase !== "idle" || leaving.current || !expandedRef.current) return;
    root.current
      ?.querySelector<HTMLButtonElement>(".journal-notification-summary")
      ?.focus({ preventScroll: true });
    expandedRef.current = false;
    pause("expanded", false);
    setExpanded(false);
  }, [phase, pause]);

  useEffect(() => {
    const collapseFromBackdrop = () => closeDetails();
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
    setExpanded(next);
  };

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
  const renderUndo = (footer = false) => (
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
        undo?.label ??
        (undo ? "Undo change" : "Undo unavailable for this notice")
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
    const ApplyIcon = mode === "now" ? RefreshCcw : Clock3;
    const label = mode === "now" ? "Apply Now" : "Next Open";
    return (
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="journal-update-choice"
        data-update-choice={mode}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (leaving.current) return;
          value.onClick(event);
          if (mode === "later" || !event.defaultPrevented)
            onRequestDismiss(mode === "later" ? "cancel" : "action");
        }}
      >
        <ApplyIcon aria-hidden="true" />
        <span>{label}</span>
      </Button>
    );
  };

  const renderHeaderAction = () => {
    const acknowledge = kind === "info" && dismissible;
    if (
      acknowledge ||
      (!undo &&
        (kind === "warning" ||
          kind === "error" ||
          kind === "loading" ||
          kind === "info"))
    ) {
      const ActionIcon = acknowledge ? Check : expanded ? Minimize2 : Info;
      const label = acknowledge ? "Got it" : expanded ? "Collapse" : "Details";
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="journal-notification-revert"
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
    return (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="journal-notification-revert journal-update-header-action"
        aria-label="Apply update and reload"
        title="Apply update and reload"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (leaving.current) return;
          action.onClick(event);
          if (!event.defaultPrevented) onRequestDismiss("action");
        }}
      >
        <span className="journal-notification-revert-symbol" aria-hidden="true">
          <RefreshCcw />
        </span>
        <span className="journal-notification-revert-label" aria-hidden="true">
          Freshen Up
        </span>
      </Button>
    );
  };

  const paragraphs = details?.paragraphs ?? [defaultContext[kind]];
  const facts = details?.facts?.slice(0, 4) ?? [];
  const previewRecord = details?.preview?.after ?? details?.preview?.before;
  const footerCopy = previewRecord
    ? undo
      ? "Undo reverses this saved change."
      : previewRecord.kind === "check-in"
        ? "Your writing stays in the full check-in."
        : previewRecord.kind === "medication"
          ? "Medication settings apply to linked entries."
          : "Tracking days begin at 06:00."
    : (details?.footer ?? defaultFooter[kind]);
  const updatePanel = kind === "update" && (
    <section className="journal-update-panel" aria-label="Update Details">
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
      <div className="journal-update-intro">
        <CloudDownload aria-hidden="true" />
        <p>
          The new app files are staged. Pick the hand-off that fits what you’re
          doing now.
        </p>
      </div>
      <div
        className="journal-update-choices"
        role="group"
        aria-label="Update Timing"
      >
        {renderUpdateChoice(action, "now")}
        {renderUpdateChoice(cancel, "later")}
      </div>
      <div className="journal-update-notes" aria-label="Update Notes">
        <div>
          <RefreshCcw aria-hidden="true" />
          <span>
            <strong>App Shell</strong>
            <small>Latest interface files are ready.</small>
          </span>
        </div>
        <div>
          <Database aria-hidden="true" />
          <span>
            <strong>Your Journal</strong>
            <small>Saved records stay exactly where they are.</small>
          </span>
        </div>
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Safe Handoff</strong>
            <small>Finish any open draft before applying now.</small>
          </span>
        </div>
      </div>
      <p className="journal-update-fine-print">
        <ShieldCheck aria-hidden="true" />
        No journal records are removed. Need the longer version?{" "}
        <Link href="/guide#app" prefetch={false} onClick={followRelatedLink}>
          Open the app guide
        </Link>
        .
      </p>
    </section>
  );
  return (
    <div
      ref={root}
      className="journal-notification"
      data-notification-id={id}
      data-notification-host-id={nativeHostId}
      data-kind={kind}
      data-variant={variant}
      data-expanded={expanded}
      data-phase={phase}
      data-icon-state={reversed ? "reverse" : "forward"}
      data-paused="true"
      data-motion-paused="true"
      data-timer-mode={Number.isFinite(duration) ? "countdown" : "indefinite"}
      style={
        { "--notification-remaining": initialReading.progress } as CSSProperties
      }
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
        if (event.key === "Escape" && stack.expanded && stack.count > 1) {
          event.preventDefault();
          stack.collapse();
          return;
        }
        if (event.key === "Escape" && expandedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          closeDetails();
          return;
        }
        if (
          event.key === "Escape" &&
          dismissible &&
          phase === "idle" &&
          undoState !== "pending"
        ) {
          event.stopPropagation();
          onRequestDismiss("dismiss");
        }
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
            style={{ inlineSize: `${initialReading.progress * 100}%` }}
          />
          <span className="journal-notification-countdown-sheen" />
        </div>
      </div>
      <NotificationCountdownBadge
        seconds={counter.seconds}
        paused={counter.paused}
        hidden={counter.hidden}
      />
      <span className="journal-notification-urgency-glow" aria-hidden="true" />
      <span className="journal-notification-footer-fade" aria-hidden="true" />
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
                  <NotificationStatusBadge status={kind} />
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
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="journal-notification-details-inner">
          <div className="journal-notification-main">
            {updatePanel ? (
              updatePanel
            ) : details?.preview ? (
              <NotificationChangePreview preview={details.preview} />
            ) : facts.length ? (
              <>
                {kind === "info" && (
                  <p className="journal-notification-facts-intro">{message}</p>
                )}
                <dl className="journal-notification-facts">
                  {facts.map((fact, index) => (
                    <div key={index}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : paragraphs.length ? (
              <div className="journal-notification-context">
                <Info aria-hidden="true" />
                <p>{paragraphs[0]}</p>
              </div>
            ) : null}
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
              {details?.links?.map((link) => {
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
                (undo || kind === "success") &&
                renderUndo(true)}
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
            <span className="journal-notification-footer-copy">
              {footerCopy}
            </span>
            <span className="journal-notification-footer-note">
              {details?.preview ? "These cards capture this change. " : null}
              {details?.links?.length ? (
                <>
                  Open{" "}
                  {details.links.slice(0, 2).map((link, index) => (
                    <span key={link.href}>
                      {index > 0 && " or "}
                      <a
                        href={link.href}
                        aria-label={link.label}
                        tabIndex={expanded ? 0 : -1}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={followRelatedLink}
                      >
                        {linkPresentation(
                          link.href,
                          link.label,
                        ).caption.toLowerCase()}
                      </a>
                    </span>
                  ))}{" "}
                  for the latest details.{" "}
                </>
              ) : null}
              Find your entries and drafts in your{" "}
              <Link
                href="/"
                prefetch={false}
                tabIndex={expanded ? 0 : -1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={followRelatedLink}
              >
                daily log
              </Link>
              .
            </span>
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
