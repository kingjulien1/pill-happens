"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AppData } from "@/lib/domain";

type JournalContext = {
  data: AppData | null;
  now: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (path: string, body?: unknown, method?: string) => Promise<void>;
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
  const router = useRouter();

  const refresh = useCallback(async () => {
    const startedAtRevision = revision.current;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error || "Your journal couldn't be loaded.");
      if (!pending.current && startedAtRevision === revision.current) {
        setData(body);
        setNow(new Date());
      }
      setError(null);
    } catch {
      setError(
        "Your journal couldn't be loaded. Check your connection and try again.",
      );
    }
  }, [router]);

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
      update();
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [refresh]);

  const mutate = async (path: string, body?: unknown, method = "POST") => {
    if (pending.current)
      throw new Error("Please wait for your last change to save.");
    pending.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      const res = await fetch(`/api/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await res.json();
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Please sign in again.");
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

  return (
    <Context.Provider value={{ data, now, error, refresh, mutate, busy }}>
      {children}
    </Context.Provider>
  );
}

export function useJournal() {
  const value = useContext(Context);
  if (!value) throw new Error("Journal provider is missing.");
  return value;
}
