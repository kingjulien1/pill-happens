import { APP_THEME_VALUES } from "@/lib/app-theme";

/** Device-local appearance only; it is never part of journal data or backups. */
export const APPEARANCE_STORAGE_KEY = "pill-happens:appearance:v1";
export const APPEARANCE_CHANGE_EVENT = "pill:appearance-change";
export type AppearancePreference = "light" | "dark" | "system";
export type ResolvedAppearance = "light" | "dark";
export type AppearanceSnapshot = {
  preference: AppearancePreference;
  resolved: ResolvedAppearance;
  persisted: boolean;
};

type AppearanceController = {
  version: 1;
  getSnapshot: () => AppearanceSnapshot;
  setPreference: (preference: AppearancePreference) => void;
  sync: () => void;
};

declare global {
  interface Window {
    __pillAppearance?: AppearanceController;
  }
}

export function normalizeAppearance(value: unknown): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveAppearance(
  preference: AppearancePreference,
  darkSystem: boolean,
): ResolvedAppearance {
  return preference === "system" ? (darkSystem ? "dark" : "light") : preference;
}

const BOOT_CONFIG = {
  key: APPEARANCE_STORAGE_KEY,
  event: APPEARANCE_CHANGE_EVENT,
  light: APP_THEME_VALUES.light.background,
  dark: APP_THEME_VALUES.dark.background,
} as const;

/** Self-contained: the same implementation runs in HEAD and in the client. */
function installAppearance(config: typeof BOOT_CONFIG) {
  if (window.__pillAppearance?.version === 1) return;
  const root = document.documentElement;
  let media: MediaQueryList | undefined;
  try {
    media = window.matchMedia("(prefers-color-scheme: dark)");
  } catch {
    // Native light paint remains usable in restricted/embedded browser contexts.
  }
  const normalize = (value: unknown): AppearancePreference =>
    value === "light" || value === "dark" ? value : "system";
  let preference: AppearancePreference = "system";
  let persisted = true;
  try {
    preference = normalize(window.localStorage.getItem(config.key));
  } catch {
    persisted = false;
    // Session choices still apply when device storage is unavailable.
  }
  let snapshot: AppearanceSnapshot;
  const syncMeta = () => {
    if (!snapshot) return;
    // Update every media-qualified entry so browser chrome follows a manual mode.
    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    ))
      meta.content = snapshot.resolved === "dark" ? config.dark : config.light;
  };
  const apply = () => {
    const resolved =
      preference === "system"
        ? media?.matches
          ? "dark"
          : "light"
        : preference;
    const changed =
      !snapshot ||
      snapshot.preference !== preference ||
      snapshot.resolved !== resolved ||
      snapshot.persisted !== persisted;
    if (changed) snapshot = { preference, resolved, persisted };
    root.dataset.colorMode = resolved;
    root.dataset.colorPreference = preference;
    root.style.colorScheme = resolved;
    syncMeta();
    if (changed) window.dispatchEvent(new Event(config.event));
  };
  window.__pillAppearance = {
    version: 1,
    getSnapshot: () => snapshot,
    setPreference: (value) => {
      preference = normalize(value);
      try {
        window.localStorage.setItem(config.key, preference);
        persisted = true;
      } catch {
        persisted = false;
        // Preserve the in-memory choice; persistence is a browser capability.
      }
      apply();
    },
    sync: apply,
  };
  media?.addEventListener("change", () => {
    if (preference === "system") apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== config.key && event.key !== null) return;
    // Ignore sessionStorage and unrelated journals' data changes.
    try {
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
    } catch {
      return;
    }
    preference = normalize(event.newValue);
    persisted = true;
    apply();
  });
  apply();
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", syncMeta, { once: true });
}

// tsx/esbuild's development keep-names helper must remain local to this script.
// Production SWC does not need it; it is harmless and never escapes the closure.
export const APPEARANCE_BOOT_SCRIPT = `(function(){function __name(value){return value;}(${installAppearance.toString()})(${JSON.stringify(BOOT_CONFIG)});})();`;

function controller() {
  installAppearance(BOOT_CONFIG);
  return window.__pillAppearance!;
}

const serverSnapshot: AppearanceSnapshot = {
  preference: "system",
  resolved: "light",
  persisted: false,
};
export const getServerAppearanceSnapshot = () => serverSnapshot;
export const getAppearanceSnapshot = () => controller().getSnapshot();
export const setAppearancePreference = (preference: AppearancePreference) =>
  controller().setPreference(preference);
export function subscribeAppearance(onChange: () => void) {
  controller();
  window.addEventListener(APPEARANCE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, onChange);
}
