"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { ToastSymbol } from "@/components/ui/sonner";

export type JournalToastKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";

export type JournalToastOptions = ExternalToast & {
  /** Short context, kept separate from the complete message below it. */
  heading?: ReactNode;
};

type ToastMessage = Parameters<typeof sonnerToast>[0];

const kindLabels: Record<JournalToastKind, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
  loading: "Loading",
  update: "Update",
};

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
  const { heading = defaultHeadings[kind], ...nativeOptions } = options;
  const title = (
    <span className="journal-toast-heading">
      <span className="journal-toast-heading-text">{heading}</span>
      <span className="journal-toast-heading-meta">
        <span className="journal-toast-heading-dot" aria-hidden="true">
          ·
        </span>
        <span className="journal-toast-kind">{kindLabels[kind]}</span>
      </span>
    </span>
  );
  const send = kind === "update" ? sonnerToast.message : sonnerToast[kind];
  return send(title, {
    ...nativeOptions,
    description:
      nativeOptions.description === undefined
        ? message
        : nativeOptions.description,
    ...(kind === "update" && nativeOptions.icon === undefined
      ? { icon: <ToastSymbol kind="update" /> }
      : {}),
    className: [`journal-toast--${kind}`, nativeOptions.className]
      .filter(Boolean)
      .join(" "),
  });
}

const ofKind =
  (kind: JournalToastKind) =>
  (message: ToastMessage, options?: JournalToastOptions) =>
    notify(kind, message, options);

/** Structured copy; Sonner remains the owner of IDs, actions and dismissal. */
export const toast = Object.assign(ofKind("info"), {
  success: ofKind("success"),
  error: ofKind("error"),
  info: ofKind("info"),
  warning: ofKind("warning"),
  loading: ofKind("loading"),
  update: ofKind("update"),
  message: ofKind("info"),
  dismiss: sonnerToast.dismiss,
});
