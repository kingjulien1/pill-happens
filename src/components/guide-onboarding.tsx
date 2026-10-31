"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";

type GuideStatus = "ready" | "saving" | "error";
type GuideContext = {
  firstVisit: boolean;
  acknowledge: () => Promise<void>;
  focusError: () => void;
};
const Context = createContext<GuideContext | null>(null);

/** Acknowledgement records opening the guide, never requires finishing it. */
export function GuideOnboardingBoundary({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  const [firstVisit] = useState(pending);
  const unacknowledged = useRef(pending);
  const mounted = useRef(true);
  const request = useRef<{
    controller: AbortController;
    promise: Promise<void>;
  } | null>(null);
  const errorElement = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<GuideStatus>(
    pending ? "saving" : "ready",
  );

  const acknowledge = useCallback(() => {
    if (!unacknowledged.current) return Promise.resolve();
    if (request.current) return request.current.promise;
    const controller = new AbortController();
    if (mounted.current) setStatus("saving");
    const promise = (async () => {
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch("/api/onboarding/guide", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          keepalive: true,
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        if (
          !response.ok ||
          !result ||
          typeof result !== "object" ||
          !("ok" in result) ||
          result.ok !== true ||
          controller.signal.aborted
        )
          throw new Error("Guide acknowledgement was not saved.");
        unacknowledged.current = false;
        if (mounted.current && request.current?.controller === controller)
          setStatus("ready");
      } catch (cause) {
        if (mounted.current && request.current?.controller === controller)
          setStatus("error");
        throw cause;
      } finally {
        clearTimeout(timeout);
        if (request.current?.controller === controller) request.current = null;
      }
    })();
    request.current = { controller, promise };
    return promise;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void acknowledge().catch(() => {
      // A visible retry remains available; reading the guide stays usable.
    });
    return () => {
      mounted.current = false;
      // A quick departure still counts as opening the guide. Let the bounded
      // keepalive finish; Strict Mode's second setup shares the same request.
    };
  }, [acknowledge]);

  const focusError = useCallback(() => {
    requestAnimationFrame(() => errorElement.current?.focus());
  }, []);

  return (
    <Context.Provider value={{ firstVisit, acknowledge, focusError }}>
      <div className="contents" data-guide-onboarding={status}>
        {status === "error" && (
          <div
            ref={errorElement}
            tabIndex={-1}
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-popover p-4 text-xs leading-relaxed text-popover-foreground outline-offset-4"
          >
            <p className="max-w-sm">
              We couldn’t save that you’ve opened the guide. Try again to
              continue to your daily log. You can keep reading here meanwhile.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void acknowledge().catch(focusError)}
            >
              Try Again
            </Button>
          </div>
        )}
        {children}
      </div>
    </Context.Provider>
  );
}

type GuideStartLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onNavigate"
>;

/** Native link semantics remain available for modified clicks and new tabs. */
export function GuideStartLink({ children, ...props }: GuideStartLinkProps) {
  const context = useContext(Context);
  const navigating = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Link
      {...props}
      href="/"
      prefetch={false}
      aria-busy={busy || undefined}
      data-guide-start-link
      onNavigate={(event) => {
        if (!context?.firstVisit) return;
        event.preventDefault();
        if (navigating.current) return;
        navigating.current = true;
        setBusy(true);
        void context
          .acknowledge()
          .then(() => {
            if (!mounted.current) return;
            // Bypass any root response prefetched while the first visit was
            // still pending. The server now directs this journal to Today.
            window.location.assign(new URL("/", window.location.href).href);
          })
          .catch(() => {
            if (!mounted.current) return;
            navigating.current = false;
            setBusy(false);
            context.focusError();
          });
      }}
    >
      {children}
    </Link>
  );
}
