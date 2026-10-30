"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ActionIcon } from "@/components/action-icon";
import { Brand, BrandMark } from "@/components/brand";
import { useJournal } from "@/components/journal-provider";
import {
  BRAND_REFRESH_MARKER,
  BRAND_REFRESH_SLOP,
  BRAND_REFRESH_THRESHOLD,
  brandPullOffset,
  isBrandRefreshPull,
  isRecentBrandRefresh,
} from "@/lib/brand-refresh";

type RefreshPhase = "idle" | "reloading" | "restoring";
type PageRefreshContext = { refreshPage: () => void; unavailable: boolean };
const Context = createContext<PageRefreshContext | null>(null);

function clearRefreshMarker() {
  try {
    sessionStorage.removeItem(BRAND_REFRESH_MARKER);
  } catch {
    // Refresh still works when Safari or a privacy setting blocks storage.
  }
}

export function PageRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, error, busy } = useJournal();
  const [phase, setPhase] = useState<RefreshPhase>("idle");
  const requested = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let restoring = false;
    try {
      restoring = isRecentBrandRefresh(
        sessionStorage.getItem(BRAND_REFRESH_MARKER),
        window.location.pathname + window.location.search,
        Date.now(),
      );
    } catch {
      // The normal journal loading state is the storage-free fallback.
    }
    if (!restoring) {
      clearRefreshMarker();
      return;
    }
    const timer = setTimeout(() => setPhase("restoring"), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "restoring") return;
    // Errors return to the journal's existing retry UI, never an endless cover.
    const timer = setTimeout(
      () => {
        clearRefreshMarker();
        setPhase("idle");
      },
      data || error ? 300 : 23_000,
    );
    return () => clearTimeout(timer);
  }, [data, error, phase]);

  useEffect(
    () => () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    },
    [],
  );

  const refreshPage = useCallback(() => {
    if (busy || phase !== "idle" || requested.current) return;
    requested.current = true;
    setPhase("reloading");
    try {
      sessionStorage.setItem(
        BRAND_REFRESH_MARKER,
        JSON.stringify({
          at: Date.now(),
          path: window.location.pathname + window.location.search,
        }),
      );
    } catch {
      // Storing the cosmetic hand-off is optional; reloading is not.
    }
    // Let the intermediate state paint before starting a document navigation.
    reloadTimer.current = setTimeout(() => window.location.reload(), 450);
  }, [busy, phase]);

  return (
    <Context.Provider
      value={{ refreshPage, unavailable: busy || phase !== "idle" }}
    >
      <div inert={phase !== "idle"} aria-busy={phase !== "idle" || undefined}>
        {children}
      </div>
      {phase !== "idle" && (
        <div className="page-refresh-screen" data-page-refresh={phase}>
          <div
            className="page-refresh-card"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="page-refresh-loader" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none">
                <circle className="page-refresh-track" cx="32" cy="32" r="28" />
                <circle className="page-refresh-arc" cx="32" cy="32" r="28" />
              </svg>
              <BrandMark className="size-8" />
            </span>
            <p className="text-sm font-semibold">Refreshing Your Journal</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Reloading this page and your latest entries.
            </p>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

export function usePageRefresh() {
  const context = useContext(Context);
  if (!context) throw new Error("Page refresh provider is missing.");
  return context;
}

type PullGesture = {
  pointer: number;
  x: number;
  y: number;
  moved: boolean;
  cancelled: boolean;
};

export function PullToRefreshBrand() {
  const { refreshPage, unavailable } = usePageRefresh();
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<PullGesture | null>(null);
  const suppressClick = useRef(false);
  const handle = useRef<HTMLAnchorElement>(null);
  const hintId = useId();
  const ready = distance >= BRAND_REFRESH_THRESHOLD;
  const progress = Math.min(1, distance / BRAND_REFRESH_THRESHOLD);

  const cancelPull = useCallback(() => {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    suppressClick.current ||= current.moved;
    setDistance(0);
    setDragging(false);
    if (handle.current?.hasPointerCapture(current.pointer))
      handle.current.releasePointerCapture(current.pointer);
  }, []);

  useEffect(() => {
    const cancelOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelPull();
    };
    const cancelWhenHidden = () => {
      if (document.visibilityState === "hidden") cancelPull();
    };
    const cancelMultipleTouches = (event: TouchEvent) => {
      if (event.touches.length > 1) cancelPull();
    };
    window.addEventListener("blur", cancelPull);
    window.addEventListener("keydown", cancelOnKey);
    document.addEventListener("visibilitychange", cancelWhenHidden);
    document.addEventListener("touchstart", cancelMultipleTouches, {
      passive: true,
    });
    return () => {
      window.removeEventListener("blur", cancelPull);
      window.removeEventListener("keydown", cancelOnKey);
      document.removeEventListener("visibilitychange", cancelWhenHidden);
      document.removeEventListener("touchstart", cancelMultipleTouches);
    };
  }, [cancelPull]);

  const movePull = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId) return;
    const x = event.clientX - current.x;
    const y = event.clientY - current.y;
    if (Math.hypot(x, y) > BRAND_REFRESH_SLOP) {
      current.moved = true;
      suppressClick.current = true;
      if (y < -BRAND_REFRESH_SLOP || Math.abs(x) * 1.5 >= Math.max(y, 0))
        current.cancelled = true;
    }
    setDistance(current.cancelled ? 0 : Math.max(0, y));
  };

  return (
    <div
      className="brand-refresh relative justify-self-center"
      data-dragging={dragging}
      data-ready={ready}
      style={
        { "--brand-pull": `${brandPullOffset(distance)}px` } as CSSProperties
      }
      onPointerDown={(event) => {
        if (!event.isPrimary || gesture.current) {
          cancelPull();
          return;
        }
        if (event.button !== 0 || unavailable) return;
        suppressClick.current = false;
        gesture.current = {
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
          cancelled: false,
        };
        handle.current?.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={movePull}
      onPointerUp={(event) => {
        const current = gesture.current;
        if (!current || current.pointer !== event.pointerId) return;
        current.moved ||=
          Math.hypot(event.clientX - current.x, event.clientY - current.y) >
          BRAND_REFRESH_SLOP;
        const shouldRefresh =
          !current.cancelled &&
          isBrandRefreshPull(
            event.clientX - current.x,
            event.clientY - current.y,
          );
        cancelPull();
        if (shouldRefresh) refreshPage();
      }}
      onPointerCancel={cancelPull}
      onLostPointerCapture={cancelPull}
    >
      <Brand
        ref={handle}
        className="brand-refresh-handle"
        aria-describedby={hintId}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current || unavailable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={() => {
          // A cancelled pointer gesture must not consume a later keyboard tap.
          suppressClick.current = false;
        }}
      />
      <span id={hintId} className="sr-only">
        Pull down and release to refresh this page, or use Refresh Page in the
        navigation menu. Tap to go home.
      </span>
      <span
        className="brand-refresh-hint"
        data-visible={distance > BRAND_REFRESH_SLOP}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="brand-refresh-progress" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle
              className="brand-refresh-progress-track"
              cx="12"
              cy="12"
              r="9"
            />
            <circle
              cx="12"
              cy="12"
              r="9"
              pathLength="1"
              strokeDasharray={`${progress} 1`}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <ActionIcon name={ready ? "selected" : "export"} className="size-3" />
        </span>
        <span>{ready ? "Release To Refresh" : "Pull To Refresh"}</span>
      </span>
    </div>
  );
}
