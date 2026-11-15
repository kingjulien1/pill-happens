"use client";

import type { CSSProperties, SVGProps } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleAlert,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATION_DEFAULT_DURATION } from "@/lib/journal-notification-lifecycle";
import "./sonner.css";

type ToastSymbolKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";
const symbols = {
  success: BellCheck,
  error: CircleAlert,
  info: Lightbulb,
  warning: TriangleAlert,
  loading: RefreshCcw,
  update: Sparkles,
};

/** Lucide-format local BellCheck for the installed icon set's missing export. */
function BellCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h10" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="m16 16 2 2 4-4" />
    </svg>
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
  const Icon = symbols[kind];
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
        <span className="journal-toast-halo journal-toast-halo-echo" />
        <span className="journal-toast-flash" />
        <span className="journal-toast-plate journal-toast-plate-back" />
        <span className="journal-toast-plate journal-toast-plate-middle" />
        <span className="journal-toast-tile">
          <span className="journal-toast-glyph-enter">
            <Icon
              className="journal-toast-glyph"
              width={27.5625}
              height={27.5625}
              strokeWidth={2.8}
            />
          </span>
        </span>
        <span className="journal-toast-sparks">
          {Array.from({ length: 8 }, (_, index) => (
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
      duration={NOTIFICATION_DEFAULT_DURATION}
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
