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
import { SaveStatusLine } from "./save-status-line";
import statusStyles from "./save-status-line.module.css";
import {
  EMPTY_INTAKE_STACK_VIEW,
  normalizeIntakeStackView,
  type IntakeStackView,
} from "@/lib/intake-stack-layout";
import {
  createDraftWorkspace,
  safeRememberedDialog,
  safeWorkspaceHash,
  safeWorkspacePath,
  shouldRestoreLastScreen,
  type DraftStorageStatus,
  type DraftWorkspace,
  type RememberedDialog,
  type WorkspaceSnapshot,
} from "@/lib/journal-drafts";
import {
  createSnapshotSelector,
  shallowEqual,
} from "@/lib/external-store-selector";
import { Button } from "@/components/ui/button";

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

/** Subscribe to the fields this consumer actually displays, rather than every keystroke. */
export function useWorkspaceSnapshot<Selection>(
  store: DraftWorkspace,
  select: (snapshot: WorkspaceSnapshot) => Selection,
  equal: (left: Selection, right: Selection) => boolean = Object.is,
) {
  const getters = useMemo(() => {
    const selected = createSnapshotSelector(select, equal);
    const serverSelected = createSnapshotSelector(select, equal);
    return {
      getSnapshot: () => selected(store.getSnapshot()),
      getServerSnapshot: () => serverSelected(store.getServerSnapshot()),
    };
  }, [store, select, equal]);
  return useSyncExternalStore(
    store.subscribe,
    getters.getSnapshot,
    getters.getServerSnapshot,
  );
}

export function JournalDraftProvider({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  const store = useMemo(() => createDraftWorkspace(scope), [scope]);
  const path = usePathname();
  const selectWorkspace = useCallback(
    (snapshot: WorkspaceSnapshot) => ({
      hydrated: snapshot.hydrated,
      ready: snapshot.ready,
      dialog: snapshot.screens[path]?.dialog ?? null,
      instance: snapshot.screens[path]?.dialogInstance ?? 0,
    }),
    [path],
  );
  const snapshot = useWorkspaceSnapshot(store, selectWorkspace, shallowEqual);
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
    if (!snapshot.hydrated) return;
    const synchronize = () => {
      store.synchronize();
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key === store.storageKey) synchronize();
    };
    const becameVisible = () => {
      if (!document.hidden) synchronize();
    };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", synchronize);
    window.addEventListener("pageshow", synchronize);
    document.addEventListener("visibilitychange", becameVisible);
    // Catch writes made between initial hydration and subscribing to events.
    synchronize();
    return () => {
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("pageshow", synchronize);
      document.removeEventListener("visibilitychange", becameVisible);
    };
  }, [snapshot.hydrated, store]);

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
      if (timer !== null) clearTimeout(timer);
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
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(save, 240);
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

  const storedDialog = snapshot.dialog;
  const instance = snapshot.instance;
  const dialog = useMemo(
    () => storedDialog && safeRememberedDialog(storedDialog, path),
    [path, storedDialog],
  );
  const openDialog = useCallback(
    (next: RememberedDialog) => store.openDialog(path, next),
    [path, store],
  );
  const closeDialog = useCallback(
    (expected?: RememberedDialog) =>
      store.closeDialog(path, expected, instance),
    [instance, path, store],
  );

  const value = useMemo(
    () => ({
      store,
      ready: snapshot.ready,
      dialog,
      openDialog,
      closeDialog,
      rememberDestination,
    }),
    [
      store,
      snapshot.ready,
      dialog,
      openDialog,
      closeDialog,
      rememberDestination,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOptionalJournalWorkspace() {
  return useContext(Context);
}

export function useJournalWorkspace() {
  const value = useOptionalJournalWorkspace();
  if (!value) throw new Error("Journal draft provider is missing.");
  return value;
}

/** Parent hydration completes before a day mounts, so its first layout is final. */
export function usePersistentIntakeStackView(
  day: string,
  entries: readonly { id: string }[],
) {
  const { store } = useJournalWorkspace();
  const [fallback, setFallback] = useState<{
    store: DraftWorkspace;
    day: string;
    members: readonly string[];
    view: IntakeStackView;
  } | null>(null);
  const selectView = useCallback(
    (snapshot: WorkspaceSnapshot) => ({
      saved: snapshot.stackViews[day] ?? EMPTY_INTAKE_STACK_VIEW,
      status: snapshot.status,
    }),
    [day],
  );
  const snapshot = useWorkspaceSnapshot(store, selectView, shallowEqual);
  const memory =
    fallback?.store === store && fallback.day === day ? fallback : null;
  const saved = snapshot.saved;
  const members = memory && new Set(memory.members);
  const retained = memory
    ? {
        // A regroup can bring in another group's remembered open/closed state.
        // Override only this failed writer's IDs, preserving the other context.
        heads: [
          ...saved.heads.filter((id) => !members!.has(id)),
          ...memory.view.heads,
        ],
        expanded: [
          ...saved.expanded.filter((id) => !members!.has(id)),
          ...memory.view.expanded,
        ],
      }
    : saved;
  return {
    view: normalizeIntakeStackView(entries, retained),
    // Called from user event handlers, never a React state updater or an effect.
    saveView: (view: IntakeStackView) => {
      const members = entries.map((entry) => entry.id);
      const normalized = normalizeIntakeStackView(entries, view);
      const accepted = store.setStackView(day, members, normalized);
      // Validation/size rejection deliberately leaves the durable record alone.
      // Keep that user's target locally too, rather than reverting after motion.
      setFallback(accepted ? null : { store, day, members, view: normalized });
      return accepted;
    },
    status: memory ? ("memory" as const) : snapshot.status,
  };
}

/** One quiet notice per day, only when device persistence is unavailable. */
export function StackViewStorageStatus() {
  const { store } = useJournalWorkspace();
  const status = useWorkspaceSnapshot(store, (snapshot) => snapshot.status);
  if (status === "saved") return null;
  return (
    <p
      role="status"
      className="canvas-copy mt-3 text-center text-[10px] leading-relaxed text-muted-foreground"
      data-stack-view-storage-status={status}
    >
      {status === "memory"
        ? "Stack views are kept for this visit; device storage is unavailable."
        : "Stack views are kept for this visit; saved views may not survive reopening."}
    </p>
  );
}

export function usePersistentDraft<T>(
  key: string,
  initial: () => T,
  validate: (value: unknown) => value is T,
) {
  const { store } = useJournalWorkspace();
  const selectDraft = useCallback(
    (snapshot: WorkspaceSnapshot) => ({
      draft: snapshot.drafts[key],
      status: snapshot.status,
    }),
    [key],
  );
  const snapshot = useWorkspaceSnapshot(store, selectDraft, shallowEqual);
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
  const saved = snapshot.draft?.value;
  let hasDraft = false;
  try {
    hasDraft = snapshot.draft !== undefined && validate(saved);
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
      snapshot.draft !== undefined && !hasDraft
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
  action,
  copy,
}: {
  hasDraft: boolean;
  status: DraftStorageStatus;
  restored?: boolean;
  onReset?: () => void;
  action?: ReactNode;
  copy?: { idle?: string; saved?: string; restored?: string };
}) {
  const durable = status === "saved";
  const restoredDraft = durable && hasDraft && restored;
  const draftTone = restoredDraft ? "restored" : hasDraft ? "saved" : "normal";
  const text = !durable
    ? !hasDraft && status === "error"
      ? "Draft couldn’t be restored. You can start fresh."
      : "Device storage unavailable. Draft lasts this visit."
    : !hasDraft
      ? (copy?.idle ?? "Edits stay on this device until saved.")
      : restored
        ? (copy?.restored ?? "Restored draft on this device.")
        : (copy?.saved ?? "Draft saved on this device.");
  return (
    <div
      className={statusStyles.footerStatus}
      data-draft-status={status}
      data-restored={restoredDraft ? "" : undefined}
    >
      <SaveStatusLine text={text} tone={durable ? draftTone : "warning"} />
      {action ??
        (hasDraft && onReset && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            data-dialog-corner="compact"
            className="shrink-0 rounded px-1 py-0.5 text-foreground/70 underline-offset-2 focus-visible:underline h-auto min-h-0 text-[10px] font-normal"
            onClick={onReset}
          >
            Reset Draft
          </Button>
        ))}
    </div>
  );
}
