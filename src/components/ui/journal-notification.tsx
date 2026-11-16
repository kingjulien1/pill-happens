"use client";

import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
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
  Info,
  LoaderCircle,
  Minimize2,
  MoonStar,
  PillBottle,
  Target,
  Undo2,
} from "lucide-react";
import type { Action, ExternalToast } from "sonner";
import { ToastSymbol } from "@/components/ui/sonner";
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
};

export type JournalNotificationProps = {
  id: NotificationId;
  kind: JournalToastKind;
  heading: ReactNode;
  message: ReactNode;
  duration: number;
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
  kind,
  heading,
  message,
  duration,
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
    const readingClock = new NotificationClock(duration);
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
          outer?.dataset.front === "false" ||
          outer?.dataset.mounted === "false" ||
          outer?.dataset.visible === "false",
      );
      setPause("hidden", document.hidden);
      if (document.hidden) clearPointers();
      setPause("rear", outer?.dataset.front === "false");
      setPause("unmounted", outer?.dataset.mounted === "false");
      setPause("invisible", outer?.dataset.visible === "false");
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
    const tick = () => {
      const snapshot = readingClock.snapshot();
      element.style.setProperty(
        "--notification-remaining",
        String(snapshot.progress),
      );
      element.dataset.paused = String(snapshot.paused);
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
  }, [duration, isCurrent, onRequestDismiss, releasePointer, clearPointers]);

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

  const renderUndo = (footer = false) =>
    undo && (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={
          footer
            ? "journal-notification-tool journal-notification-footer-undo"
            : "journal-notification-revert journal-notification-undo"
        }
        data-undo-state={undoState}
        disabled={undoState !== "ready" || phase !== "idle"}
        aria-busy={undoState === "pending"}
        aria-label={
          undoState === "pending"
            ? (undo.pendingLabel ?? "Undoing change")
            : undoState === "done"
              ? (undo.successLabel ?? "Change undone")
              : (undo.label ?? "Undo change")
        }
        title={undo.label ?? "Undo change"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={runUndo}
      >
        <span className="journal-notification-revert-symbol" aria-hidden="true">
          {undoState === "pending" ? (
            <LoaderCircle />
          ) : undoState === "done" ? (
            <Check />
          ) : (
            <Undo2 />
          )}
        </span>
        <span className="journal-notification-revert-label" aria-hidden="true">
          {undoState === "pending"
            ? "Undoing"
            : undoState === "done"
              ? "Undone"
              : "Undo"}
        </span>
      </Button>
    );

  const collapseDetails = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (phase !== "idle" || leaving.current) return;
    // Move keyboard focus out before the details subtree becomes inert.
    root.current
      ?.querySelector<HTMLButtonElement>(".journal-notification-summary")
      ?.focus({ preventScroll: true });
    expandedRef.current = false;
    pause("expanded", false);
    setExpanded(false);
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
  return (
    <div
      ref={root}
      className="journal-notification"
      data-notification-id={id}
      data-kind={kind}
      data-variant={variant}
      data-expanded={expanded}
      data-phase={phase}
      data-icon-state={reversed ? "reverse" : "forward"}
      data-paused="true"
      data-motion-paused="true"
      data-timer-mode={Number.isFinite(duration) ? "countdown" : "indefinite"}
      style={{ "--notification-remaining": 1 } as CSSProperties}
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
      <div className="journal-notification-countdown" aria-hidden="true">
        <span
          ref={progress}
          className="journal-notification-countdown-bar"
          style={{ inlineSize: "100%" }}
        />
      </div>
      <div className="journal-notification-header">
        <button
          type="button"
          className="journal-notification-summary"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-labelledby={headingId}
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
                <NotificationStatusBadge status={kind} />
              </span>
              <span className="journal-notification-description" id={messageId}>
                {message}
              </span>
            </span>
          </span>
        </button>
        {!expanded && renderUndo()}
      </div>
      <div
        className="journal-notification-details"
        id={detailsId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!expanded}
        inert={!expanded}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="journal-notification-details-inner">
          <div className="journal-notification-main">
            {details?.preview ? (
              <NotificationChangePreview preview={details.preview} />
            ) : facts.length ? (
              <dl className="journal-notification-facts">
                {facts.map((fact, index) => (
                  <div key={index}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
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
                    onClick={(event) => {
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
                    }}
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
              {renderUndo(true)}
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
            </div>
            <span className="journal-notification-footer-copy">
              {footerCopy}
            </span>
            {(cancel || action) && (
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
