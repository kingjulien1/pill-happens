"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  ArrowUp,
  Check,
  Info,
  RefreshCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "./sonner.css";

type ToastSymbolKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";
const symbols = {
  success: Check,
  error: X,
  info: Info,
  warning: TriangleAlert,
  loading: RefreshCcw,
  update: ArrowUp,
};

/** Independent wrappers keep arrival, quiet motion and departure from competing.
 * The open rings supply the circle for the default exclamation-point symbol. */
export function ToastSymbol({ kind }: { kind: ToastSymbolKind }) {
  const Icon = symbols[kind];
  return (
    <span
      className="journal-toast-symbol"
      data-toast-symbol={kind}
      aria-hidden="true"
    >
      <span className="journal-toast-art-arrival" key={kind}>
        <span className="journal-toast-halo" />
        <span className="journal-toast-tile">
          <span className="journal-toast-wash" />
          <span className="journal-toast-orbits">
            <span className="journal-toast-orbit journal-toast-orbit-main" />
            <span className="journal-toast-orbit journal-toast-orbit-light" />
          </span>
          <span className="journal-toast-glyph-enter">
            <span className="journal-toast-glyph-float">
              {kind === "info" ? (
                <svg
                  className="journal-toast-glyph"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 6v8" />
                  <path d="M12 18h.01" />
                </svg>
              ) : (
                <Icon
                  className="journal-toast-glyph"
                  size={22}
                  strokeWidth={2.5}
                />
              )}
            </span>
          </span>
        </span>
        <span className="journal-toast-arrival-wave" />
        <span className="journal-toast-arrival-wave journal-toast-arrival-echo" />
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
      gap={15}
      visibleToasts={3}
      closeButton
      offset={{ top: "max(22px, calc(env(safe-area-inset-top, 0px) + 12px))" }}
      mobileOffset={{
        top: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px))",
        left: 16,
        right: 16,
      }}
      swipeDirections={["top", "left", "right"]}
      containerAriaLabel="Journal notifications"
      {...props}
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
