"use client";

import {
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight, Check, LoaderCircle, Undo2 } from "lucide-react";
import type { Action, ExternalToast } from "sonner";
import { ToastSymbol } from "@/components/ui/sonner";
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

const kindLabels: Record<JournalToastKind, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
  loading: "Loading",
  update: "Update",
};

const defaultContext: Record<JournalToastKind, string> = {
  success: "Your journal has been updated. You can carry on from here.",
  error:
    "The change was not confirmed. Review the message, then try again when you’re ready. Unsaved form inputs stay in their draft.",
  info: "A little context for your journal. Your saved entries stay as they are unless this notice says otherwise.",
  warning:
    "Take a moment to review this notice before continuing. Keeping it open pauses its timer.",
  loading:
    "The current action is still running. This notice will update when a result is available; it has no countdown while you wait.",
  update:
    "A new version is ready. Reload after finishing your current entry; saved records and drafts remain in your journal.",
};

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
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
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

  const pause = (reason: string, value: boolean) => {
    if (value) pauseReasons.current.add(reason);
    else pauseReasons.current.delete(reason);
    clock.current?.pause(reason, value);
  };

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
      setPause("rear", outer?.dataset.front === "false");
      setPause("unmounted", outer?.dataset.mounted === "false");
      setPause("invisible", outer?.dataset.visible === "false");
      setPause("swiping", outer?.dataset.swiping === "true");
      if (outer?.dataset.removed === "true") {
        setPause("removed", true);
        setReversed(true);
      }
    };
    const releasePointer = () => setPause("pointer", false);
    const observer = new MutationObserver(syncNative);
    if (outer)
      observer.observe(outer, {
        attributes: true,
        attributeFilter: [
          "data-front",
          "data-mounted",
          "data-visible",
          "data-swiping",
          "data-removed",
        ],
      });
    document.addEventListener("visibilitychange", syncNative);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
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
      clearInterval(interval);
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
      clock.current = null;
    };
  }, [duration, isCurrent, onRequestDismiss]);

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
        suppressClick.current = false;
        pointer.current = { x: event.clientX, y: event.clientY };
        pause("pointer", true);
      }}
      onPointerUpCapture={(event) => {
        const start = pointer.current;
        suppressClick.current = Boolean(
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8,
        );
        pointer.current = null;
        pause("pointer", false);
      }}
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
                <span className="journal-toast-heading-meta">
                  <span
                    className="journal-toast-heading-dot"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className="journal-toast-kind">{kindLabels[kind]}</span>
                </span>
              </span>
              <span className="journal-notification-description" id={messageId}>
                {message}
              </span>
            </span>
          </span>
        </button>
        {undo && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="journal-notification-revert journal-notification-undo"
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
            <span
              className="journal-notification-revert-symbol"
              aria-hidden="true"
            >
              {undoState === "pending" ? (
                <LoaderCircle />
              ) : undoState === "done" ? (
                <Check />
              ) : (
                <Undo2 />
              )}
            </span>
            <span
              className="journal-notification-revert-label"
              aria-hidden="true"
            >
              {undoState === "pending"
                ? "Undoing"
                : undoState === "done"
                  ? "Undone"
                  : "Undo"}
            </span>
          </Button>
        )}
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
          {details?.preview ? (
            <NotificationChangePreview preview={details.preview} />
          ) : (
            paragraphs
              .slice(0, 1)
              .map((paragraph, index) => <p key={index}>{paragraph}</p>)
          )}
          {!details?.preview && Boolean(details?.facts?.length) && (
            <dl className="journal-notification-facts">
              {details?.facts?.map((fact, index) => (
                <div key={index}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {Boolean(details?.links?.length) && (
            <div className="journal-notification-links">
              {details?.links?.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  tabIndex={expanded ? 0 : -1}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {link.label}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
          {undoError && (
            <p className="journal-notification-error" role="alert">
              {undoError}
            </p>
          )}
          <div className="journal-notification-footer">
            <span className="journal-notification-footer-copy">
              {(details?.preview ? undefined : details?.footer) ??
                (expanded
                  ? "A little reading time. The timer’s paused."
                  : kind === "loading"
                    ? "Still working. No disappearing act."
                    : "Tap for context · Swipe to dismiss")}
            </span>
            <span className="journal-notification-actions">
              {renderAction(cancel, true)}
              {renderAction(action)}
            </span>
          </div>
        </div>
      </div>
      <div className="journal-notification-countdown" aria-hidden="true">
        <span
          ref={progress}
          className="journal-notification-countdown-bar"
          style={{ inlineSize: "100%" }}
        />
      </div>
    </div>
  );
}
