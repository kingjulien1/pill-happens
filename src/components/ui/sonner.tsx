"use client";

import type { CSSProperties } from "react";
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

/** Square plates share the journal artwork language; Sonner owns the card motion. */
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
        <span className="journal-toast-plate journal-toast-plate-back" />
        <span className="journal-toast-plate journal-toast-plate-middle" />
        <span className="journal-toast-tile">
          <span className="journal-toast-wash" />
          <span className="journal-toast-glyph-enter">
            <span className="journal-toast-glyph-float">
              <Icon
                className="journal-toast-glyph"
                size={18}
                strokeWidth={2.5}
              />
            </span>
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
