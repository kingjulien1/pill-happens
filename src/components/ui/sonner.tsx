"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useId,
  useRef,
  useSyncExternalStore,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner";
import {
  CircleAlert,
  CircleEqual,
  RefreshCcw,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationRocket } from "@/components/ui/notification-rocket";
import { useNotificationModal } from "@/components/ui/use-notification-modal";
import { NOTIFICATION_DEFAULT_DURATION } from "@/lib/journal-notification-lifecycle";
import {
  NOTIFICATION_MAX_ACTIVE,
  NOTIFICATION_STACK_GAP,
  NOTIFICATION_STACK_CHANGE_EVENT,
  getNotificationQueueSnapshot,
  getServerNotificationQueueSnapshot,
  subscribeNotificationQueue,
  releaseNotificationHost,
  retiringNotificationHosts,
} from "@/lib/notification-admission";

import "./sonner.css";

type ToastSymbolKind =
  "success" | "error" | "info" | "warning" | "loading" | "update";

export const NOTIFICATION_COLLAPSE_EVENT =
  "pill-happens:collapse-notification-details";

export type NotificationCollapseDetail = { target: HTMLElement };

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
  update: NotificationRocket,
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

/** Rear cards turn independently of each other and the status glyph. */
export function ToastSymbol({
  kind,
  variant,
  reversed = false,
}: {
  kind: ToastSymbolKind;
  variant?: "intake-saved" | "unchanged";
  reversed?: boolean;
}) {
  const Icon = variant === "unchanged" ? CircleEqual : symbols[kind];
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

/** One continuously visible list; each card owns its details independently. */
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
    (current.dataset.front === "true" &&
      current.dataset.removed !== "true" &&
      current.dataset.notificationRetired !== "true")
  )
    return;
  const front = region.querySelector<HTMLElement>(
    '[data-sonner-toast]:not([data-removed="true"]):not([data-notification-retired="true"])',
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
  visibleToasts: _visibleToasts,
  expand: _expand,
  gap: _gap,
  swipeDirections = ["left", "right"],
  ...props
}: ToasterProps) {
  void _visibleToasts;
  void _expand;
  void _gap;
  const region = useRef<HTMLDivElement>(null);
  const { toasts } = useSonner();
  const count = toasts.filter(
    (entry) =>
      !entry.delete &&
      (props.id ? entry.toasterId === props.id : !entry.toasterId),
  ).length;
  const queue = useSyncExternalStore(
    subscribeNotificationQueue,
    getNotificationQueueSnapshot,
    getServerNotificationQueueSnapshot,
  );
  const outsidePointers = useRef(new Set<number>());
  const [held, setHeld] = useState(false);
  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return;
    let frame = 0;
    let previous = "";
    const sync = () => {
      frame = 0;
      const viewport = window.visualViewport;
      const values = [
        viewport?.offsetTop ?? 0,
        viewport?.offsetLeft ?? 0,
        viewport?.width ?? innerWidth,
        viewport?.height ?? innerHeight,
      ];
      const key = values.join(":");
      if (key === previous) return;
      previous = key;
      ["top", "left", "width", "height"].forEach((name, i) =>
        element.style.setProperty(
          `--notification-view-${name}`,
          `${values[i]}px`,
        ),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", schedule, {
      passive: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, []);
  const modalOpen = useNotificationModal(region, false, held);
  const outsideRelease = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const collapse = useCallback(
    () => window.dispatchEvent(new Event(NOTIFICATION_COLLAPSE_EVENT)),
    [],
  );
  const stack = useMemo(
    () => ({ expanded: true, count, reveal: () => {}, collapse }),
    [count, collapse],
  );
  const collapseOutside = () => {
    clearTimeout(outsideRelease.current);
    outsideRelease.current = setTimeout(() => {
      collapse();
      setHeld(false);
    }, 0);
  };
  useEffect(() => () => clearTimeout(outsideRelease.current), []);

  useEffect(() => {
    if (!count) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const element = region.current;
      if (!element) return;
      const focused = document.activeElement?.closest<HTMLElement>(
        ".journal-notification",
      );
      const focusedCard = focused && element.contains(focused) ? focused : null;
      if (focusedCard?.dataset.expanded === "false") return;
      const opened =
        focusedCard ??
        [
          ...element.querySelectorAll<HTMLElement>(
            '.journal-notification[data-expanded="true"][data-phase="idle"]',
          ),
        ].find((card) => !card.closest('[inert], [aria-hidden="true"]'));
      if (!opened) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat)
        window.dispatchEvent(
          new CustomEvent<NotificationCollapseDetail>(
            NOTIFICATION_COLLAPSE_EVENT,
            { detail: { target: opened } },
          ),
        );
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [count]);

  useEffect(() => {
    const element = region.current;
    if (!element) return;
    let anchor: {
      list: HTMLElement;
      host: HTMLElement;
      top: number;
      scroll: number;
    } | null = null;
    const capturePosition = () => {
      const list = element.querySelector<HTMLElement>("[data-sonner-toaster]");
      if (!list || list.scrollTop < 1) {
        anchor = null;
        return;
      }
      const top = list.getBoundingClientRect().top;
      const host = [...list.children].find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node.matches(
            '[data-sonner-toast]:not([data-removed="true"]):not([data-notification-retired="true"])',
          ) &&
          node.getBoundingClientRect().bottom > top,
      );
      anchor = host
        ? {
            list,
            host,
            top: host.getBoundingClientRect().top,
            scroll: list.scrollTop,
          }
        : null;
    };
    const restorePosition = () => {
      const saved = anchor;
      anchor = null;
      if (
        !saved?.host.isConnected ||
        saved.host.dataset.notificationRetired === "true" ||
        Math.abs(saved.list.scrollTop - saved.scroll) > 1
      )
        return;
      saved.list.scrollTop +=
        saved.host.getBoundingClientRect().top - saved.top;
    };
    window.addEventListener(NOTIFICATION_STACK_CHANGE_EVENT, capturePosition);
    const syncHost = (host: HTMLElement) => {
      const hidden =
        host.dataset.visible === "false" ||
        host.dataset.removed === "true" ||
        host.dataset.notificationRetired === "true";
      if (hidden && host.contains(document.activeElement))
        focusNotificationFront(element);
      if (host.inert !== hidden) host.inert = hidden;
    };
    const sync = () =>
      element
        .querySelectorAll<HTMLElement>("[data-sonner-toast]")
        .forEach(syncHost);
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            (record.type === "childList" &&
              record.target instanceof HTMLElement &&
              record.target.matches("[data-sonner-toaster]")) ||
            record.attributeName === "data-notification-retired",
        )
      )
        restorePosition();
      for (const record of records) {
        for (const removed of record.removedNodes) {
          if (!(removed instanceof HTMLElement)) continue;
          const nodes = [
            removed,
            ...removed.querySelectorAll<HTMLElement>(
              "[data-notification-host-id]",
            ),
          ];
          for (const node of nodes) {
            const id = node.dataset.notificationHostId;
            if (id && !element.contains(node)) releaseNotificationHost(id);
          }
        }
      }
      if (records.some((record) => record.type === "childList")) sync();
      else
        for (const record of records)
          if (
            record.target instanceof HTMLElement &&
            record.target.matches("[data-sonner-toast]")
          )
            syncHost(record.target);
    });
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-visible",
        "data-removed",
        "data-notification-retired",
      ],
    });
    sync();
    return () => {
      observer.disconnect();
      window.removeEventListener(
        NOTIFICATION_STACK_CHANGE_EVENT,
        capturePosition,
      );
      // An entire toaster can leave during logout/navigation without delivering
      // another observed child removal. Do not strand those retired slots.
      queueMicrotask(() => {
        const present = new Set(
          [
            ...document.querySelectorAll<HTMLElement>(
              "[data-notification-host-id]",
            ),
          ].map((node) => node.dataset.notificationHostId),
        );
        for (const id of retiringNotificationHosts())
          if (!present.has(id)) releaseNotificationHost(id);
      });
    };
  }, []);

  useEffect(() => {
    region.current
      ?.querySelectorAll<HTMLElement>("[data-sonner-toaster]")
      .forEach((list) => {
        list.dataset.notificationWaiting = String(queue.waiting);
      });
  }, [queue.waiting, count]);

  return (
    <NotificationStackContext.Provider value={stack}>
      <div
        ref={region}
        style={{ display: "contents" }}
        data-notification-stack-expanded="true"
        data-notification-stack-count={count}
        data-notification-modal={modalOpen}
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
            clearTimeout(outsideRelease.current);
            outsidePointers.current.add(event.pointerId);
            setHeld(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
            outsidePointers.current.delete(event.pointerId);
            if (!outsidePointers.current.size) collapseOutside();
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            outsidePointers.current.delete(event.pointerId);
            if (!outsidePointers.current.size) collapseOutside();
          }}
          onLostPointerCapture={(event) => {
            if (
              outsidePointers.current.delete(event.pointerId) &&
              !outsidePointers.current.size
            )
              collapseOutside();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        />
        <Sonner
          position="top-center"
          duration={NOTIFICATION_DEFAULT_DURATION}
          offset={{
            top: "max(22px, calc(env(safe-area-inset-top, 0px) + 12px))",
          }}
          mobileOffset={{
            top: "max(18px, calc(env(safe-area-inset-top, 0px) + 12px))",
            left: 16,
            right: 16,
          }}
          {...props}
          containerAriaLabel={
            queue.waiting
              ? `Journal notifications, ${count} in the stack, ${queue.waiting} waiting`
              : (props.containerAriaLabel ?? "Journal notifications")
          }
          expand={true}
          gap={NOTIFICATION_STACK_GAP}
          visibleToasts={NOTIFICATION_MAX_ACTIVE}
          swipeDirections={swipeDirections.filter(
            (direction) => direction === "left" || direction === "right",
          )}
          closeButton={false}
          className={cn(
            "toaster group journal-toaster journal-toaster-scroll",
            className,
          )}
          icons={{ ...statusIcons, ...icons }}
          style={
            {
              "--width":
                "min(460px, calc(var(--notification-view-width, 100vw) - 32px))",
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
