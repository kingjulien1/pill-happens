"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useJournal } from "@/components/journal-provider";
import { ActionIcon } from "@/components/action-icon";
import {
  createDraftWorkspace,
  safeRememberedDialog,
  safeWorkspaceHash,
  safeWorkspacePath,
  shouldRestoreLastScreen,
  type DraftStorageStatus,
  type DraftWorkspace,
  type RememberedDialog,
} from "@/lib/journal-drafts";

export type { RememberedDialog } from "@/lib/journal-drafts";
const destinationEvent = "pill:workspace-destination";

/** A full document navigation can declare its destination before pagehide. */
export function rememberJournalDestination(path: string) {
  if (typeof window !== "undefined" && safeWorkspacePath(path))
    window.dispatchEvent(new CustomEvent(destinationEvent, { detail: path }));
}

type WorkspaceContext = {
  store: DraftWorkspace;
  ready: boolean;
  dialog: RememberedDialog | null;
  openDialog: (dialog: RememberedDialog) => void;
  closeDialog: (expected?: RememberedDialog) => void;
  rememberDestination: (path: string) => void;
};
const Context = createContext<WorkspaceContext | null>(null);

export function JournalDraftProvider({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  const store = useMemo(() => createDraftWorkspace(scope), [scope]);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const path = usePathname();
  const router = useRouter();
  const { data } = useJournal();
  const bootstrapped = useRef(false);
  const target = useRef<string | null>(null);
  const explicitDestination = useRef<string | null>(null);
  const scrollFrame = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Memory-only drafts remain usable. */
    }
    store.hydrate(storage);
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [store]);

  useEffect(() => {
    if (!snapshot.hydrated || !data) return;
    let restoreScroll = false;
    const waitForRoute = (destination: string) => {
      target.current = destination;
      resumeTimer.current = setTimeout(() => {
        target.current = null;
        store.completeBootstrap();
      }, 8_000);
    };
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      const saved = store.getSnapshot();
      if (data.onboarding?.guidePending && path === "/") {
        waitForRoute("/guide");
        router.replace("/guide#start", { scroll: false });
        return;
      }
      if (
        shouldRestoreLastScreen({
          pathname: path,
          search: window.location.search,
          hash: window.location.hash,
          savedPath: saved.lastPath,
          guidePending: Boolean(data.onboarding?.guidePending),
          referrer: document.referrer,
          origin: window.location.origin,
        })
      ) {
        const next = saved.lastPath;
        const hash = saved.screens[next]?.hash ?? "";
        waitForRoute(next);
        router.replace(`${next}${hash}`, { scroll: false });
        return;
      }
      restoreScroll = !window.location.hash && saved.lastPath === path;
    } else if (target.current) {
      if (path !== target.current && path === "/") return;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      target.current = null;
      restoreScroll = !window.location.hash;
    }
    const savedScreen = store.getSnapshot().screens[path];
    const y = restoreScroll ? (savedScreen?.scrollY ?? 0) : window.scrollY;
    explicitDestination.current = null;
    store.setLocation(path, window.location.hash, y);
    if (!store.getSnapshot().ready) store.completeBootstrap();
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = requestAnimationFrame(() => {
        if (window.location.pathname !== path) return;
        if (
          window.location.hash &&
          !window.location.search &&
          !path.startsWith("/streaks")
        ) {
          const id = safeWorkspaceHash(window.location.hash).slice(1);
          document
            .getElementById(id)
            ?.scrollIntoView({ block: "start", behavior: "auto" });
        } else if (restoreScroll) window.scrollTo({ top: y, behavior: "auto" });
      });
    });
    return () => cancelAnimationFrame(scrollFrame.current);
  }, [data, path, router, snapshot.hydrated, store]);

  const rememberDestination = useCallback(
    (destination: string) => {
      const safe = safeWorkspacePath(destination);
      if (!safe) return;
      explicitDestination.current = safe;
      store.closeDialog(safe);
      store.setLocation(safe, "", 0);
    },
    [store],
  );

  useEffect(() => {
    if (!snapshot.ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      timer = null;
      const destination = explicitDestination.current;
      if (destination) store.setLocation(destination, "", 0);
      else
        store.setLocation(
          window.location.pathname,
          window.location.hash,
          window.scrollY,
        );
    };
    const scroll = () => {
      if (timer === null) timer = setTimeout(save, 120);
    };
    const leave = () => {
      if (timer !== null) clearTimeout(timer);
      save();
    };
    const visibility = () => {
      if (document.hidden) leave();
    };
    const destination = (event: Event) => {
      if (typeof (event as CustomEvent<unknown>).detail === "string")
        rememberDestination((event as CustomEvent<string>).detail);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("hashchange", save);
    window.addEventListener("pagehide", leave);
    window.addEventListener(destinationEvent, destination);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("hashchange", save);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener(destinationEvent, destination);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [rememberDestination, snapshot.ready, store]);

  const storedDialog = snapshot.screens[path]?.dialog ?? null;
  const instance = snapshot.screens[path]?.dialogInstance ?? 0;
  const dialog = storedDialog && safeRememberedDialog(storedDialog, path);
  const openDialog = useCallback(
    (next: RememberedDialog) => store.openDialog(path, next),
    [path, store],
  );
  const closeDialog = useCallback(
    (expected?: RememberedDialog) =>
      store.closeDialog(path, expected, instance),
    [instance, path, store],
  );

  return (
    <Context.Provider
      value={{
        store,
        ready: snapshot.ready,
        dialog,
        openDialog,
        closeDialog,
        rememberDestination,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useJournalWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Journal draft provider is missing.");
  return value;
}

export function usePersistentDraft<T>(
  key: string,
  initial: () => T,
  validate: (value: unknown) => value is T,
) {
  const { store } = useJournalWorkspace();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [baseline, setBaseline] = useState(() => ({ key, value: initial() }));
  const [restored, setRestored] = useState(() => {
    try {
      return (
        Object.hasOwn(store.getSnapshot().drafts, key) &&
        validate(store.getSnapshot().drafts[key]?.value)
      );
    } catch {
      return false;
    }
  });
  const fallback = baseline.key === key ? baseline.value : initial();
  const saved = snapshot.drafts[key]?.value;
  let hasDraft = false;
  try {
    hasDraft = Object.hasOwn(snapshot.drafts, key) && validate(saved);
  } catch {
    /* Invalid stored input uses fresh defaults. */
  }
  const value = hasDraft ? (saved as T) : fallback;
  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    const current = store.getSnapshot().drafts[key]?.value;
    let previous = fallback;
    try {
      if (validate(current)) previous = current;
    } catch {
      /* Fresh defaults remain safe. */
    }
    const updated =
      typeof next === "function"
        ? (next as (previous: T) => T)(previous)
        : next;
    store.setDraft(key, updated);
  };
  return {
    value,
    setValue,
    hasDraft,
    restored,
    status:
      Object.hasOwn(snapshot.drafts, key) && !hasDraft
        ? ("error" as const)
        : snapshot.status,
    clearDraft: () => store.clearDraft(key),
    resetDraft: (next: T) => {
      setBaseline({ key, value: next });
      setRestored(false);
      store.clearDraft(key);
    },
  };
}

export function DraftStatus({
  hasDraft,
  status,
  restored = false,
  onReset,
}: {
  hasDraft: boolean;
  status: DraftStorageStatus;
  restored?: boolean;
  onReset?: () => void;
}) {
  if (!hasDraft && status === "saved") return null;
  const durable = status === "saved";
  return (
    <div
      className="flex min-w-0 items-start justify-between gap-3 text-[10px] leading-relaxed text-muted-foreground"
      data-draft-status={status}
    >
      <p role="status" className="flex min-w-0 items-start gap-1.5">
        <ActionIcon
          name={durable ? "save" : "retry"}
          className="mt-0.5 size-3 shrink-0"
        />
        <span>
          {durable
            ? `${restored ? "Restored draft" : "Draft saved"} on this device.`
            : !hasDraft && status === "error"
              ? "A saved draft could not be restored. You can continue with fresh values."
              : "Draft kept for this visit. Device storage is unavailable, so reopening may lose it."}
        </span>
      </p>
      {hasDraft && onReset && (
        <button
          type="button"
          className="shrink-0 rounded px-1 py-0.5 text-foreground/70 underline-offset-2 focus-visible:underline"
          onClick={onReset}
        >
          Reset Draft
        </button>
      )}
    </div>
  );
}
