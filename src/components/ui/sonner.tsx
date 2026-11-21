"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner";
import { CircleAlert, RefreshCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATION_DEFAULT_DURATION } from "@/lib/journal-notification-lifecycle";
import "./sonner.css";

type ToastSymbolKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";

export const NOTIFICATION_COLLAPSE_EVENT =
  "pill-happens:collapse-notification-details";

/** Split Lucide paths keep the lit cloud and emerald transfer arrows independent. */
function CloudSync(props: SVGProps<SVGSVGElement>) {
  const lightId = useId();
  const cloudOutline =
    "M20.996 15.251A4.5 4.5 0 0 0 17.495 8h-1.79a7 7 0 1 0-12.709 5.607";
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
      <defs>
        <radialGradient id={`${lightId}-fill`} cx="43%" cy="28%" r="76%">
          <stop stopColor="var(--toast-cloud-light)" stopOpacity=".98" />
          <stop
            offset=".55"
            stopColor="var(--toast-cloud-light)"
            stopOpacity=".7"
          />
          <stop
            offset="1"
            stopColor="var(--toast-cloud-light)"
            stopOpacity=".04"
          />
        </radialGradient>
        <filter
          id={`${lightId}-halo`}
          x="-45%"
          y="-60%"
          width="190%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="1.35" />
        </filter>
      </defs>
      <g className="journal-toast-update-cloud">
        <g className="journal-toast-update-cloud-light" opacity={2 / 3}>
          <path
            className="journal-toast-update-cloud-halo"
            d={cloudOutline}
            strokeWidth="5"
            opacity=".82"
            filter={`url(#${lightId}-halo)`}
          />
          {/* The closed helper follows Lucide Cloud, shifted up to match CloudSync.
              Only its light is visible; the actual cloud stroke stays crisp. */}
          <path
            d="M17.5 17H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
            fill={`url(#${lightId}-fill)`}
            stroke="none"
          />
        </g>
        <path d={cloudOutline} />
      </g>
      <g className="journal-toast-update-arrows">
        <path d="m17 18-1.535 1.605a5 5 0 0 1-8-1.5" />
        <path d="M17 22v-4h-4" />
        <path d="M7 10v4h4" />
        <path d="m7 14 1.535-1.605a5 5 0 0 1 8 1.5" />
      </g>
    </svg>
  );
}

function NotificationBulb(props: SVGProps<SVGSVGElement>) {
  const haloId = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <defs>
        <radialGradient id={haloId}>
          <stop stopColor="#fff8ca" />
          <stop offset=".667" stopColor="#fff8ca" stopOpacity=".8" />
          <stop offset=".86" stopColor="#fff8ca" stopOpacity=".32" />
          <stop offset="1" stopColor="#fff8ca" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${haloId}-crown`}>
          <rect x="-10" y="-14" width="44" height="23" />
        </clipPath>
      </defs>
      <ellipse
        className="journal-bulb-halo"
        cx="12"
        cy="7"
        rx="14"
        ry="13"
        fill={`url(#${haloId})`}
        stroke="none"
      />
      <path
        className="journal-bulb-glass"
        d="M9 18c0-2.2-.7-3.3-2.2-5A7 7 0 1 1 17.2 13c-1.5 1.7-2.2 2.8-2.2 5Z"
      />
      <path d="M9 21.5h6 M10.5 25h3" stroke="currentColor" strokeWidth="2" />
      <g className="journal-bulb-rays" strokeWidth="1.5">
        {["M12 -1v-3", "M4 2 2 0", "M20 2l2-2", "M2.5 9H0", "M21.5 9H24"].map(
          (d) => (
            <path key={d} pathLength="1" d={d} />
          ),
        )}
      </g>
      <g clipPath={`url(#${haloId}-crown)`}>
        <g className="journal-bulb-echo-rays" strokeWidth="1.15">
          {[-67.5, -22.5, 22.5, 67.5].map((angle) => (
            <path
              key={angle}
              d="M12 -1v-2"
              transform={`rotate(${angle} 12 9)`}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

const symbols = {
  success: BellCheck,
  error: CircleAlert,
  info: NotificationBulb,
  warning: TriangleAlert,
  loading: RefreshCcw,
  update: CloudSync,
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

/** Layered artwork; only the update glyph adds a small CSS motion loop. */
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
        <span className="journal-toast-plate-arrival journal-toast-plate-arrival-middle">
          <span className="journal-toast-plate-spin journal-toast-plate-spin-middle">
            <span className="journal-toast-plate journal-toast-plate-middle" />
          </span>
        </span>
        <span className="journal-toast-plate-arrival journal-toast-plate-arrival-back">
          <span className="journal-toast-plate-spin journal-toast-plate-spin-back">
            <span className="journal-toast-plate journal-toast-plate-back" />
          </span>
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

function focusNotificationFront(region: HTMLDivElement | null) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !region?.contains(active)) return;
  const current = active.closest<HTMLElement>("[data-sonner-toast]");
  if (
    !current ||
    (current.dataset.front === "true" && current.dataset.removed !== "true")
  )
    return;
  const front = region.querySelector<HTMLElement>(
    '[data-sonner-toast]:not([data-removed="true"])',
  );
  const target = front?.querySelector<HTMLElement>(
    ".journal-notification-summary, button:not(:disabled), a[href]",
  );
  (target ?? front)?.focus({ preventScroll: true });
}

/** The shadcn Sonner adapter, themed through the app's existing appearance owner. */
export function Toaster({
  className,
  style,
  icons,
  toastOptions,
  visibleToasts: collapsedVisibleToasts = 3,
  swipeDirections = ["top", "left", "right"],
  ...props
}: ToasterProps) {
  const region = useRef<HTMLDivElement>(null);
  const [stackOpen, setStackOpen] = useState(false);
  const { toasts } = useSonner();
  const count = toasts.filter(
    (entry) =>
      !entry.delete &&
      (props.id ? entry.toasterId === props.id : !entry.toasterId),
  ).length;
  const [previousCount, setPreviousCount] = useState(count);
  // Sonner's external store shrinking to one ends this explicit reveal. Adjust
  // only on a changed snapshot, before rendering a subsequent new stack.
  if (count !== previousCount) {
    setPreviousCount(count);
    if (count <= 1 && stackOpen) setStackOpen(false);
  }
  const collapse = useCallback(() => {
    // A lower card will become a folded/hidden rear face. Keep keyboard focus
    // on a retained, visible control before restoring the native stack layout.
    focusNotificationFront(region.current);
    region.current
      ?.querySelectorAll<HTMLElement>("[data-sonner-toaster]")
      .forEach((list) => {
        list.scrollTop = 0;
      });
    setStackOpen(false);
    // Also clear Sonner's native hover fan through its existing drag-end bridge.
    region.current
      ?.querySelectorAll<HTMLElement>("[data-sonner-toaster]")
      .forEach((list) =>
        list.dispatchEvent(new Event("dragend", { bubbles: true })),
      );
  }, []);
  const reveal = useCallback(() => setStackOpen(true), []);
  const expanded = Boolean(props.expand || (stackOpen && count > 1));
  const stack = useMemo(
    () => ({
      expanded,
      count,
      reveal,
      collapse,
    }),
    [expanded, count, reveal, collapse],
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

  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const syncHost = (host: HTMLElement) => {
      const hidden =
        host.dataset.visible === "false" || host.dataset.removed === "true";
      if (hidden && host.contains(document.activeElement))
        focusNotificationFront(element);
      if (host.inert !== hidden) host.inert = hidden;
    };
    const syncVisibility = () => {
      element
        .querySelectorAll<HTMLElement>("[data-sonner-toast]")
        .forEach(syncHost);
      if (!expanded)
        element
          .querySelectorAll<HTMLElement>("[data-sonner-toaster]")
          .forEach((list) => {
            if (list.scrollTop) list.scrollTop = 0;
          });
    };
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === "childList" &&
            record.target instanceof Element &&
            record.target.matches("[data-sonner-toaster], section"),
        )
      ) {
        syncVisibility();
        return;
      }
      // A changed native host cannot affect another host's inert state. Avoid
      // rescanning an uncapped stack for each individual visibility mutation.
      const changed = new Set<HTMLElement>();
      for (const record of records)
        if (
          record.type === "attributes" &&
          record.target instanceof HTMLElement &&
          record.target.matches("[data-sonner-toast]")
        )
          changed.add(record.target);
      changed.forEach(syncHost);
    });
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-visible", "data-removed"],
    });
    syncVisibility();
    return () => observer.disconnect();
  }, [expanded, count]);

  return (
    <NotificationStackContext.Provider value={stack}>
      <div
        ref={region}
        style={{ display: "contents" }}
        data-notification-stack-expanded={expanded}
        onFocusCapture={(event) => {
          // The list hotkey and keyboard focus entering a folded rear face both
          // need the uncapped view. Pointer focus still consumes just the first
          // click in the card's existing reveal handler.
          if (
            count > 1 &&
            event.target instanceof HTMLElement &&
            (event.target.matches("[data-sonner-toaster]") ||
              (event.target.matches(":focus-visible") &&
                event.target.closest<HTMLElement>("[data-sonner-toast]")
                  ?.dataset.front === "false"))
          )
            reveal();
        }}
        onClickCapture={(event) => {
          if (expanded || count <= 1) return;
          const host =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-sonner-toast]")
              : null;
          // Managed cards already suppress held clicks before revealing the
          // fan. Give third-party/native notices the same first-click rule.
          if (host && !host.querySelector(".journal-notification")) {
            event.preventDefault();
            event.stopPropagation();
            reveal();
          }
        }}
        onPointerCancelCapture={(event) => {
          const host =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-sonner-toast]")
              : null;
          if (
            !host ||
            host.dataset.removed === "true" ||
            host.dataset.swipeOut === "true"
          )
            return;
          // A pan can start on the native host/gutter outside its managed card.
          // Always clear Sonner too when the browser takes over vertical scroll.
          host.style.setProperty("--swipe-amount-x", "0px");
          host.style.setProperty("--swipe-amount-y", "0px");
          host.dispatchEvent(new Event("dragend", { bubbles: true }));
          host.closest("[data-sonner-toaster]")?.dispatchEvent(
            new PointerEvent("pointerup", {
              bubbles: true,
              pointerId: event.pointerId,
            }),
          );
        }}
      >
        <div
          className="journal-notification-backdrop"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            window.dispatchEvent(new Event(NOTIFICATION_COLLAPSE_EVENT));
          }}
        />
        <Sonner
          position="top-center"
          duration={NOTIFICATION_DEFAULT_DURATION}
          gap={10}
          offset={{
            top: "max(22px, calc(env(safe-area-inset-top, 0px) + 12px))",
          }}
          mobileOffset={{
            top: "max(18px, calc(env(safe-area-inset-top, 0px) + 12px))",
            left: 16,
            right: 16,
          }}
          containerAriaLabel="Journal notifications"
          {...props}
          expand={expanded}
          visibleToasts={expanded ? Infinity : collapsedVisibleToasts}
          swipeDirections={
            expanded
              ? swipeDirections.filter(
                  (direction) => direction === "left" || direction === "right",
                )
              : swipeDirections
          }
          closeButton={false}
          className={cn(
            "toaster group journal-toaster",
            expanded && "journal-toaster-scroll",
            className,
          )}
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
