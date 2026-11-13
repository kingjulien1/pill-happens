"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createIntakeStackController,
  type IntakeStackController,
} from "@/lib/intake-stack-controller";

const Context = createContext<{
  day: string;
  store: IntakeStackController;
} | null>(null);
const emptyController = createIntakeStackController();

export function IntakeStackControllerProvider({
  day,
  children,
}: {
  day: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ day, store: createIntakeStackController() }),
    [day],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useIntakeStackController() {
  const store = useContext(Context)?.store ?? emptyController;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return { ...snapshot, toggleAll: store.toggleAll };
}

/** Registers only live multi-entry groups; normal handlers own motion and saving. */
export function useIntakeStackGroupControl({
  day,
  id,
  controls,
  enabled,
  open,
  onChange,
}: {
  day: string;
  id: string;
  controls: string;
  enabled: boolean;
  open: boolean;
  onChange: (showing: boolean, bulk: boolean) => void;
}) {
  const context = useContext(Context);
  const store = context?.day === day ? context.store : null;
  const latest = useRef({ open, onChange });

  useLayoutEffect(() => {
    latest.current = { open, onChange };
  }, [open, onChange]);

  useLayoutEffect(() => {
    if (!store || !enabled) return;
    return store.register({
      id,
      controls,
      open: latest.current.open,
      changeOpen: (showing) => latest.current.onChange(showing, true),
    });
  }, [controls, enabled, id, store]);

  useLayoutEffect(() => {
    if (enabled) store?.setOpen(id, open);
  }, [enabled, id, open, store]);

  return useCallback(
    (showing: boolean) => {
      if (enabled) store?.setOpen(id, showing);
      latest.current.onChange(showing, false);
    },
    [enabled, id, store],
  );
}
