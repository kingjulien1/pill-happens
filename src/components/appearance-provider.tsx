"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  getAppearanceSnapshot,
  getServerAppearanceSnapshot,
  setAppearancePreference,
  subscribeAppearance,
  type AppearancePreference,
  type AppearanceSnapshot,
} from "@/lib/appearance";

type AppearanceContextValue = AppearanceSnapshot & {
  setPreference: (preference: AppearancePreference) => void;
};
const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    getAppearanceSnapshot,
    getServerAppearanceSnapshot,
  );
  const value = useMemo(
    () => ({ ...snapshot, setPreference: setAppearancePreference }),
    [snapshot],
  );
  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value)
    throw new Error("Appearance controls require AppearanceProvider.");
  return value;
}

export function AppearanceToaster() {
  const { resolved } = useAppearance();
  return <Toaster theme={resolved} />;
}
