"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { AppData } from "@/lib/domain";
import { probeSession, recoverSession } from "@/lib/session-recovery";

type JournalContext = {
  data: AppData | null;
  now: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (path: string, body?: unknown, method?: string) => Promise<void>;
  signOut: () => Promise<void>;
  busy: boolean;
};
const Context = createContext<JournalContext | null>(null);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const revision = useRef(0);
  const signingOut = useRef(false);
  const refreshRequest = useRef<{
    controller: AbortController;
    promise: Promise<void>;
  } | null>(null);
  const heartbeat = useRef<AbortController | null>(null);
  const mutationRecovery = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    if (signingOut.current) return Promise.resolve();
    if (refreshRequest.current) return refreshRequest.current.promise;
    const startedAtRevision = revision.current;
    const controller = new AbortController();
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20_000);
    const load = () =>
      fetch("/api/state", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
    const promise = (async () => {
      try {
        let res = await load();
        if (res.status === 401) {
          const session = await recoverSession({ signal: controller.signal });
          if (controller.signal.aborted || signingOut.current) return;
          if (session === "unauthenticated") {
            if (!pending.current && startedAtRevision === revision.current) {
              setData(null);
              window.location.replace("/login");
            }
            return;
          }
          if (session !== "authenticated")
            throw new Error("Session unavailable.");
          res = await load();
          if (res.status === 401)
            throw new Error("Session is still restoring.");
        }
        const body = await res.json();
        if (!res.ok)
          throw new Error(body.error || "Your journal couldn't be loaded.");
        if (controller.signal.aborted || signingOut.current) return;
        if (!pending.current && startedAtRevision === revision.current) {
          setData(body);
          setNow(new Date());
        }
        setError(null);
      } catch {
        if (!signingOut.current && (!controller.signal.aborted || timedOut)) {
          setError(
            "Your journal couldn't be loaded. Check your connection and try again.",
          );
        }
      } finally {
        clearTimeout(deadline);
        if (refreshRequest.current?.controller === controller)
          refreshRequest.current = null;
      }
    })();
    refreshRequest.current = { controller, promise };
    return promise;
  }, []);

  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = setTimeout(() => {
      update();
      void refresh();
    }, 0);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          update();
          schedule();
        },
        60_000 - (Date.now() % 60_000) + 20,
      );
    };
    schedule();
    const onFocus = () => {
      if (document.visibilityState === "hidden" || signingOut.current) return;
      update();
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    window.addEventListener("pageshow", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const keepAlive = setInterval(
      () => {
        if (
          document.visibilityState === "hidden" ||
          signingOut.current ||
          heartbeat.current
        )
          return;
        const controller = new AbortController();
        heartbeat.current = controller;
        void probeSession({ signal: controller.signal })
          .then((session) => {
            if (session === "unauthenticated" && !controller.signal.aborted)
              void refresh();
          })
          .catch(() => {
            /* A cancelled/offline probe never clears a session. */
          })
          .finally(() => {
            if (heartbeat.current === controller) heartbeat.current = null;
          });
      },
      6 * 60 * 60 * 1000,
    );
    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
      clearInterval(keepAlive);
      refreshRequest.current?.controller.abort();
      refreshRequest.current = null;
      heartbeat.current?.abort();
      heartbeat.current = null;
      mutationRecovery.current?.abort();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const mutate = async (path: string, body?: unknown, method = "POST") => {
    if (pending.current || signingOut.current)
      throw new Error("Please wait for your last change to save.");
    pending.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      const res = await fetch(`/api/${path}`, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await res.json();
      if (res.status === 401) {
        const controller = new AbortController();
        mutationRecovery.current = controller;
        let session;
        try {
          session = await recoverSession({ signal: controller.signal });
        } finally {
          if (mutationRecovery.current === controller)
            mutationRecovery.current = null;
        }
        if (session === "unauthenticated") {
          setData(null);
          window.location.replace("/login");
          throw new Error("Please sign in again.");
        }
        // Never replay a save automatically, even after restoring its session.
        throw new Error(
          session === "authenticated"
            ? "Your sign-in is restored. Please save your entry again."
            : "We couldn't confirm your sign-in. Check your connection and try again.",
        );
      }
      if (!res.ok)
        throw new Error(result.error || "Your change couldn't be saved.");
      setData(result);
      // New intake timestamps can be later than the last minute tick.
      setNow(new Date());
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Your change couldn't be saved. Please try again.";
      toast.error(message);
      throw err;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (pending.current)
      throw new Error("Please wait for your last change to save.");
    if (signingOut.current) return;
    signingOut.current = true;
    refreshRequest.current?.controller.abort();
    heartbeat.current?.abort();
    mutationRecovery.current?.abort();
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Unable to sign out.");
      setData(null);
      window.location.replace("/login");
    } catch (error) {
      signingOut.current = false;
      throw error;
    }
  };

  return (
    <Context.Provider
      value={{ data, now, error, refresh, mutate, signOut, busy }}
    >
      {children}
    </Context.Provider>
  );
}

export function useJournal() {
  const value = useContext(Context);
  if (!value) throw new Error("Journal provider is missing.");
  return value;
}
