"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast, type ToastT } from "sonner";
import {
  JournalNotification,
  type JournalNotificationDetails,
  type JournalNotificationUndo,
} from "@/components/ui/journal-notification";
import {
  NotificationExitRegistry,
  type NotificationExitReason,
  type NotificationId,
} from "@/lib/journal-notification-lifecycle";

export type JournalToastKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";

export type JournalToastOptions = ExternalToast & {
  /** Short context, kept separate from the complete message below it. */
  heading?: ReactNode;
  details?: JournalNotificationDetails;
  undo?: JournalNotificationUndo;
  /** Reserve the Star Check artwork for a successfully saved intake. */
  variant?: "intake-saved";
};

export type { JournalNotificationDetails, JournalNotificationUndo };

type ToastMessage = Parameters<typeof sonnerToast>[0];

const exits = new NotificationExitRegistry();

const defaultHeadings: Record<JournalToastKind, string> = {
  success: "Change saved",
  error: "Action failed",
  info: "Journal notice",
  warning: "Please review",
  loading: "In progress",
  update: "Update available",
};

function notify(
  kind: JournalToastKind,
  message: ToastMessage,
  options: JournalToastOptions = {},
) {
  const {
    heading = defaultHeadings[kind],
    details,
    undo,
    variant,
    ...nativeOptions
  } = options;
  const description =
    nativeOptions.description === undefined
      ? message
      : nativeOptions.description;
  const body = typeof description === "function" ? description() : description;
  const duration =
    kind === "loading" ? Infinity : (nativeOptions.duration ?? 5_500);
  const dismissible = kind !== "loading" && nativeOptions.dismissible !== false;
  let version = -1;
  let record: ToastT;
  return sonnerToast.custom(
    (id) => {
      version = exits.begin(id);
      const currentVersion = version;
      record = {
        ...nativeOptions,
        id,
        title: heading,
        description: body,
        type: kind === "update" ? "normal" : kind,
        duration,
      };
      const finish = (reason: NotificationExitReason) => {
        if (!exits.finish(id, currentVersion)) return;
        try {
          if (reason === "timeout") nativeOptions.onAutoClose?.(record);
          else if (reason === "dismiss") nativeOptions.onDismiss?.(record);
        } finally {
          sonnerToast.dismiss(id);
        }
      };
      return (
        <JournalNotification
          key={currentVersion}
          id={id}
          kind={kind}
          heading={heading}
          message={body}
          details={details}
          undo={undo}
          variant={variant}
          icon={nativeOptions.icon}
          duration={duration}
          dismissible={dismissible}
          action={nativeOptions.action}
          cancel={nativeOptions.cancel}
          actionButtonStyle={nativeOptions.actionButtonStyle}
          cancelButtonStyle={nativeOptions.cancelButtonStyle}
          registerExit={(exit, cancelExit) =>
            exits.attach(id, currentVersion, exit, cancelExit)
          }
          onRequestDismiss={(reason) => exits.request(id, reason)}
          onExitComplete={finish}
          isCurrent={() => exits.isCurrent(id, currentVersion)}
          onDetachedUndoFailure={(error) =>
            notify(
              "error",
              error instanceof Error
                ? error.message
                : "That undo could not be confirmed.",
              {
                heading: "Undo unsuccessful",
                details: {
                  paragraphs: [
                    "The undo finished after its original notice was closed or replaced, but the change could not be confirmed. Review the latest journal state before trying again.",
                  ],
                  facts: [{ label: "Original change", value: heading }],
                  footer:
                    "No automatic retry was made. Review your journal for the latest result.",
                },
              },
            )
          }
        />
      );
    },
    {
      ...nativeOptions,
      // Sonner still owns the ID, native stack and swipes. The child reading clock
      // owns lifetime so it can finish its collapse/anticipation/exit first.
      duration: Infinity,
      dismissible,
      closeButton: false,
      description: undefined,
      icon: null,
      action: undefined,
      cancel: undefined,
      onAutoClose: undefined,
      onDismiss: (nativeRecord) => {
        if (exits.finish(nativeRecord.id, version))
          nativeOptions.onDismiss?.(record ?? nativeRecord);
      },
      className: [
        "journal-notification-host",
        `journal-toast--${kind}`,
        nativeOptions.className,
      ]
        .filter(Boolean)
        .join(" "),
    },
  );
}

const ofKind =
  (kind: JournalToastKind) =>
  (message: ToastMessage, options?: JournalToastOptions) =>
    notify(kind, message, options);

function dismiss(id?: NotificationId) {
  if (id !== undefined) {
    if (!exits.request(id)) return sonnerToast.dismiss(id);
    return id;
  }
  const managed = new Set(exits.ids());
  for (const toastId of managed) exits.request(toastId);
  const native = sonnerToast
    .getToasts()
    .filter((entry) => !managed.has(entry.id));
  for (const entry of native) sonnerToast.dismiss(entry.id);
  return managed.values().next().value ?? native[0]?.id;
}

/** One expandable notification, with native Sonner IDs, updates, stack and swipes. */
export const toast = Object.assign(ofKind("info"), {
  success: ofKind("success"),
  error: ofKind("error"),
  info: ofKind("info"),
  warning: ofKind("warning"),
  loading: ofKind("loading"),
  update: ofKind("update"),
  message: ofKind("info"),
  dismiss,
});
