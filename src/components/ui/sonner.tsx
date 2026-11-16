"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner";
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
      strokeWidth={2.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h10" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path className="journal-toast-bell-check" d="m16 16 2 2 4-4" />
      <g className="journal-toast-bell-rings">
        <path
          className="journal-toast-bell-ring-mark journal-toast-bell-ring-left"
          d="M4 2C2.8 3.7 2 5.7 2 8"
        />
        <path
          className="journal-toast-bell-ring-mark journal-toast-bell-ring-right"
          d="M22 8c0-2.3-.8-4.3-2-6"
        />
      </g>
    </svg>
  );
}

/** Finite arrival and independent ambient layers; Sonner owns the outer card. */
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
        <span className="journal-toast-plate-arrival journal-toast-plate-arrival-back">
          <span className="journal-toast-plate journal-toast-plate-back" />
        </span>
        <span className="journal-toast-plate-arrival journal-toast-plate-arrival-middle">
          <span className="journal-toast-plate journal-toast-plate-middle" />
        </span>
        <span className="journal-toast-tile">
          <span className="journal-toast-glyph-enter">
            <Icon
              className="journal-toast-glyph"
              width={27.5625}
              height={27.5625}
              strokeWidth={kind === "success" ? 2.9 : 2.8}
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

/** A stack reveal is a separate action from any notification's details. */
const NotificationStackContext = createContext({
  expanded: false,
  count: 0,
  reveal: () => {},
  collapse: () => {},
});

export const useNotificationStack = () => useContext(NotificationStackContext);

/** The shadcn Sonner adapter, themed through the app's existing appearance owner. */
export function Toaster({
  className,
  style,
  icons,
  toastOptions,
  ...props
}: ToasterProps) {
  const region = useRef<HTMLDivElement>(null);
  const [stackOpen, setStackOpen] = useState(false);
  const { toasts } = useSonner();
  const count = toasts.filter(
    (entry) => !entry.delete && entry.toasterId === props.id,
  ).length;
  const [previousCount, setPreviousCount] = useState(count);
  // Sonner's external store shrinking to one ends this explicit reveal. Adjust
  // only on a changed snapshot, before rendering a subsequent new stack.
  if (count !== previousCount) {
    setPreviousCount(count);
    if (count <= 1 && stackOpen) setStackOpen(false);
  }
  const collapse = useCallback(() => {
    setStackOpen(false);
    // Also clear Sonner's native hover fan through its existing drag-end bridge.
    region.current
      ?.querySelectorAll<HTMLElement>("[data-sonner-toaster]")
      .forEach((list) =>
        list.dispatchEvent(new Event("dragend", { bubbles: true })),
      );
  }, []);
  const reveal = useCallback(() => setStackOpen(true), []);
  const stack = useMemo(
    () => ({
      expanded: Boolean(props.expand || (stackOpen && count > 1)),
      count,
      reveal,
      collapse,
    }),
    [props.expand, stackOpen, count, reveal, collapse],
  );

  useEffect(() => {
    if (!stackOpen) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !region.current?.contains(event.target)
      )
        collapse();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapse();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [stackOpen, collapse]);

  return (
    <NotificationStackContext.Provider value={stack}>
      <div ref={region} style={{ display: "contents" }}>
        <div className="journal-notification-backdrop" aria-hidden="true" />
        <Sonner
          position="top-center"
          duration={NOTIFICATION_DEFAULT_DURATION}
          gap={10}
          visibleToasts={3}
          offset={{
            top: "max(22px, calc(env(safe-area-inset-top, 0px) + 12px))",
          }}
          mobileOffset={{
            top: "max(14px, calc(env(safe-area-inset-top, 0px) + 10px))",
            left: 16,
            right: 16,
          }}
          swipeDirections={["top", "left", "right"]}
          containerAriaLabel="Journal notifications"
          {...props}
          expand={stack.expanded}
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
      </div>
    </NotificationStackContext.Provider>
  );
}
