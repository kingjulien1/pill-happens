"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  bindJournalNotifications,
  clearJournalNotifications,
  toast,
} from "@/components/ui/journal-toast";
import {
  createDailyDerivedCache,
  type DailyDerivedValues,
} from "@/lib/daily-derived-values";
import type { AppData, Intake } from "@/lib/domain";
import { probeSession, recoverSession } from "@/lib/session-recovery";
import { checkInForDay } from "@/lib/daily-check-in";
import {
  ReflectionSaveError,
  confirmReflectionAcknowledgement,
  reflectionRetryAt,
  type ReflectionSaveInput,
  type ReflectionSaveAcknowledgement,
} from "@/lib/reflection-save";

export type JournalMutationResult = {
  /** Fence notices from async results to the journal that started the request. */
  notificationScope: string;
  data: AppData;
  /** Explicit server confirmation; missing Undo alone never means unchanged. */
  unchanged?: boolean;
  entityId?: string;
  /** Previous record captured inside the winning atomic intake save. */
  intakeChange?: { id: string; before?: Intake };
  /** Sensitive, journal-scoped receipt; its original server expiry is retained. */
  receipt?: { token: string; expiresAt: string };
  /** A short-lived, server-checked reversal of this exact successful change. */
  undo?: () => Promise<void>;
};

type JournalContext = {
  notificationScope: string;
  data: AppData | null;
  now: Date | null;
  derived?: DailyDerivedValues;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (
    path: string,
    body?: unknown,
    method?: string,
  ) => Promise<JournalMutationResult>;
  saveReflection: (
    input: ReflectionSaveInput,
  ) => Promise<ReflectionSaveAcknowledgement>;
  signOut: () => Promise<void>;
  busy: boolean;
};
const Context = createContext<JournalContext | null>(null);

export function JournalProvider({
  children,
  notificationScope,
}: {
  children: React.ReactNode;
  notificationScope: string;
}) {
  const [data, setData] = useState<AppData | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const cache = useMemo(
    () => createDailyDerivedCache(notificationScope),
    [notificationScope],
  );
  const [derived, setDerived] = useState<DailyDerivedValues>();
  const acceptData = useCallback(
    (next: AppData) => {
      setDerived(cache.get(next));
      setData(next);
    },
    [cache],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const manualPending = useRef(false);
  const reflectionRequest =
    useRef<Promise<ReflectionSaveAcknowledgement> | null>(null);
  const reflectionAbort = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const signingOut = useRef(false);
  const refreshRequest = useRef<{
    controller: AbortController;
    promise: Promise<void>;
  } | null>(null);
  const heartbeat = useRef<AbortController | null>(null);
  const mutationRecovery = useRef<AbortController | null>(null);
  const notificationBinding = useRef<(() => void) | null>(null);

  const unbindNotifications = useCallback(() => {
    const unbind = notificationBinding.current;
    notificationBinding.current = null;
    unbind?.();
  }, []);
  const clearNotifications = useCallback(() => {
    // Finish any pending checkpoint before deleting this journal's queue.
    unbindNotifications();
    clearJournalNotifications(notificationScope);
    cache.clear();
    setDerived(undefined);
  }, [notificationScope, unbindNotifications, cache]);

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
              clearNotifications();
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
          acceptData(body);
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
  }, [clearNotifications, acceptData]);

  useEffect(() => {
    if (
      data &&
      now &&
      derived &&
      (derived.expiresAt <= now.getTime() || derived.createdAt > now.getTime())
    )
      void refresh();
  }, [data, now, derived, refresh]);

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
      reflectionAbort.current?.abort();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const mutate = useCallback(
    async function mutate(
      path: string,
      body?: unknown,
      method = "POST",
      reportError = true,
    ): Promise<JournalMutationResult> {
      if (
        manualPending.current ||
        (pending.current && !reflectionRequest.current) ||
        signingOut.current
      )
        throw new Error("Please wait for your last change to save.");
      manualPending.current = true;
      setBusy(true);
      try {
        // Foreground saves never race a background response or lose the user's next click.
        await reflectionRequest.current?.catch(() => {});
        pending.current = true;
        revision.current += 1;
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
            clearNotifications();
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
        const {
          _undo: receipt,
          _unchanged,
          _intakeChange,
          ...nextData
        } = result;
        acceptData(nextData);
        // New intake timestamps can be later than the last minute tick.
        setNow(new Date());
        setError(null);
        return {
          notificationScope,
          data: nextData as AppData,
          ...(_unchanged === true ? { unchanged: true } : {}),
          ...(typeof _intakeChange?.id === "string"
            ? { intakeChange: _intakeChange as { id: string; before?: Intake } }
            : {}),
          ...(typeof receipt?.token === "string" &&
          typeof receipt?.expiresAt === "string"
            ? {
                receipt: { token: receipt.token, expiresAt: receipt.expiresAt },
              }
            : {}),
          ...(typeof receipt?.entityId === "string"
            ? { entityId: receipt.entityId }
            : {}),
          ...(typeof receipt?.token === "string"
            ? {
                undo: async () => {
                  // Errors stay in the expanded notification; never retry a write.
                  await mutate("undo", { token: receipt.token }, "POST", false);
                },
              }
            : {}),
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Your change couldn't be saved. Please try again.";
        if (reportError)
          toast.error(message, {
            journalScope: notificationScope,
            heading: "Save not confirmed.",
            details: {
              paragraphs: [
                "The server could not confirm this change. Any open form keeps its draft so you can review the inputs and try again.",
                "Check your connection and sign-in before saving again. A failed request is never replayed automatically.",
              ],
              links: [{ label: "Open Daily Log", href: "/" }],
            },
          });
        throw err;
      } finally {
        pending.current = false;
        manualPending.current = false;
        setBusy(false);
      }
    },
    [clearNotifications, notificationScope, acceptData],
  );

  useEffect(() => {
    unbindNotifications();
    notificationBinding.current = bindJournalNotifications(
      notificationScope,
      async (token) => {
        // Reuse the current provider's state updates, session checks and quiet
        // errors. Restoring a notice never automatically replays this write.
        await mutate("undo", { token }, "POST", false);
      },
    );
    return unbindNotifications;
  }, [notificationScope, mutate, unbindNotifications]);

  const saveReflection = useCallback(
    (input: ReflectionSaveInput): Promise<ReflectionSaveAcknowledgement> => {
      if (pending.current || manualPending.current || signingOut.current)
        return Promise.reject(
          new ReflectionSaveError(
            "Another journal change is saving.",
            0,
            null,
            "busy",
          ),
        );
      pending.current = true;
      revision.current += 1;
      const controller = new AbortController();
      reflectionAbort.current = controller;
      const deadline = setTimeout(() => controller.abort(), 20_000);
      const work = (async () => {
        try {
          const response = await fetch("/api/daily-check-ins/reflection", {
            method: "PATCH",
            credentials: "same-origin",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const result = await response.json().catch(() => null);
          if (response.status === 401) {
            const session = await recoverSession({ signal: controller.signal });
            if (session === "unauthenticated") {
              clearNotifications();
              setData(null);
              window.location.replace("/login");
            }
            throw new ReflectionSaveError(
              session === "authenticated"
                ? "Sign-in restored. Use Save to save your writing again."
                : "Please sign in again. Your writing is kept locally.",
              401,
            );
          }
          if (!response.ok)
            throw new ReflectionSaveError(
              result?.error ||
                "Writing could not be saved. It is still kept locally.",
              response.status,
              reflectionRetryAt(
                response.headers.get("Retry-After"),
                Date.now(),
              ),
            );
          if (
            !result ||
            !Array.isArray(result.intakes) ||
            !Array.isArray(result.medications) ||
            !Array.isArray(result.dailyCheckIns) ||
            typeof result.settings?.timezone !== "string"
          )
            throw new ReflectionSaveError(
              "The writing save could not be confirmed. It is kept locally.",
              0,
              null,
              "network",
            );
          const saved = checkInForDay(
            result.dailyCheckIns,
            input.day,
            input.period,
          );
          const acknowledgement = confirmReflectionAcknowledgement(
            input.note,
            saved,
          );
          acceptData(result);
          setNow(new Date());
          setError(null);
          return acknowledgement;
        } catch (error) {
          if (error instanceof ReflectionSaveError) throw error;
          throw new ReflectionSaveError(
            "The writing save could not be confirmed. Your local draft is safe; use Save to try again.",
            0,
            null,
            "network",
          );
        } finally {
          clearTimeout(deadline);
          if (reflectionAbort.current === controller)
            reflectionAbort.current = null;
          reflectionRequest.current = null;
          pending.current = false;
        }
      })();
      reflectionRequest.current = work;
      return work;
    },
    [acceptData, clearNotifications],
  );

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
      clearNotifications();
      setData(null);
      window.location.replace("/login");
    } catch (error) {
      signingOut.current = false;
      throw error;
    }
  };

  return (
    <Context.Provider
      value={{
        notificationScope,
        data,
        now,
        derived: derived?.scope === notificationScope ? derived : undefined,
        error,
        refresh,
        mutate,
        saveReflection,
        signOut,
        busy,
      }}
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
