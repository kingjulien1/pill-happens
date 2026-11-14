"use client";

import type { CSSProperties, SVGProps } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCheck,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "./sonner.css";

type ToastSymbolKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";
const symbols = {
  success: CheckCheck,
  error: X,
  info: Lightbulb,
  warning: TriangleAlert,
  loading: RefreshCcw,
  update: Sparkles,
};

/** Local Lucide-format artwork keeps the notification set on the same 24px grid. */
function StarCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 2.6 2.8 5.7 6.3.9-4.55 4.45 1.07 6.28L12 16.96l-5.62 2.97 1.07-6.28L2.9 9.2l6.3-.9Z" />
      <path d="m9.2 11.65 1.8 1.8 3.9-3.9" />
    </svg>
  );
}

/** Decorative only: the summary and its action buttons own all interaction. */
export function NotificationBell() {
  return (
    <span className="journal-notification-bell" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h10M10 21h4" />
        <path d="m16 16 2 2 4-4" />
      </svg>
    </span>
  );
}

/** One finite unfurl and settle; Sonner retains ownership of the surrounding card. */
export function ToastSymbol({
  kind,
  variant,
  reversed = false,
}: {
  kind: ToastSymbolKind;
  variant?: "intake-saved";
  reversed?: boolean;
}) {
  const Icon = variant === "intake-saved" ? StarCheck : symbols[kind];
  return (
    <span
      className="journal-toast-symbol"
      data-toast-symbol={kind}
      data-toast-variant={variant}
      data-toast-reversed={reversed}
      aria-hidden="true"
    >
      <span
        className="journal-toast-art-arrival"
        key={`${kind}-${variant ?? "default"}`}
      >
        <span className="journal-toast-halo" />
        <span className="journal-toast-plate journal-toast-plate-back" />
        <span className="journal-toast-plate journal-toast-plate-middle" />
        <span className="journal-toast-tile">
          <span className="journal-toast-glyph-enter">
            <Icon
              className="journal-toast-glyph"
              width={22.05}
              height={22.05}
              strokeWidth={2.5}
            />
          </span>
        </span>
        <span className="journal-toast-sparks">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="journal-toast-spark-position"
              style={{ "--spark-index": index } as CSSProperties}
            >
              <span className="journal-toast-spark" />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

const statusIcons = {
  success: <ToastSymbol key="success" kind="success" />,
  error: <ToastSymbol key="error" kind="error" />,
  info: <ToastSymbol key="info" kind="info" />,
  warning: <ToastSymbol key="warning" kind="warning" />,
  loading: <ToastSymbol key="loading" kind="loading" />,
  close: <X size={13} strokeWidth={2.25} aria-hidden="true" />,
};

/** The shadcn Sonner adapter, themed through the app's existing appearance owner. */
export function Toaster({
  className,
  style,
  icons,
  toastOptions,
  ...props
}: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      duration={5500}
      gap={10}
      visibleToasts={3}
      offset={{ top: "max(22px, calc(env(safe-area-inset-top, 0px) + 12px))" }}
      mobileOffset={{
        top: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px))",
        left: 16,
        right: 16,
      }}
      swipeDirections={["top", "left", "right"]}
      containerAriaLabel="Journal notifications"
      {...props}
      closeButton={false}
      className={cn("toaster group journal-toaster", className)}
      icons={{ ...statusIcons, ...icons }}
      style={
        {
          "--width": "min(460px, calc(100vw - 32px))",
          ...style,
        } as CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        closeButton: false,
        closeButtonAriaLabel:
          toastOptions?.closeButtonAriaLabel ?? "Dismiss notification",
        classNames: {
          ...toastOptions?.classNames,
          toast: cn("journal-toast", toastOptions?.classNames?.toast),
        },
      }}
    />
  );
}
