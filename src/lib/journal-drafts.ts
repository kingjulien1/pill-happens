import { isValidDayKey } from "@/lib/domain";
import { isStreakMilestoneTarget } from "@/lib/streak-milestones";

export type RememberedDialog = {
  kind:
    | "intake-new"
    | "intake-edit"
    | "medication-new"
    | "medication-edit"
    | "goal-new"
    | "check-in"
    | "preferences";
  id?: string;
  day?: string;
};

export type DraftStorageStatus = "saved" | "memory" | "error";
type DraftRecord = { value: unknown; updatedAt: number };
type ScreenRecord = {
  dialog: RememberedDialog | null;
  dialogInstance: number;
  hash: string;
  scrollY: number;
  updatedAt: number;
};
type SavedWorkspace = {
  version: 1;
  scope: string;
  drafts: Record<string, DraftRecord>;
  screens: Record<string, ScreenRecord>;
  lastPath: string;
};
export type WorkspaceSnapshot = SavedWorkspace & {
  hydrated: boolean;
  ready: boolean;
  status: DraftStorageStatus;
};
export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

const MAX_WORKSPACE = 1_048_576;
const MAX_DRAFT = 65_536;
const MAX_DRAFTS = 128;
const MAX_SCREENS = 64;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const ordinaryPaths = new Set([
  "/",
  "/medications",
  "/history",
  "/goals",
  "/streaks",
  "/guide",
  "/developer-guide",
]);

export function safeWorkspacePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 160) return null;
  if (ordinaryPaths.has(value)) return value;
  const day = /^\/history\/(\d{4}-\d{2}-\d{2})$/.exec(value)?.[1];
  if (day && isValidDayKey(day)) return value;
  const step = /^\/streaks\/([1-9]\d{0,15})$/.exec(value)?.[1];
  return step && isStreakMilestoneTarget(Number(step)) ? value : null;
}

export function safeWorkspaceHash(value: unknown): string {
  return typeof value === "string" &&
    /^#[A-Za-z][A-Za-z0-9_.:-]{0,99}$/.test(value)
    ? value
    : "";
}

export function safeDraftKey(key: unknown): key is string {
  if (typeof key !== "string" || key.length > 160) return false;
  if (
    [
      "med:new",
      "goal:new",
      "preferences",
      "intake:new:today",
      "view:medications",
      "view:history",
    ].includes(key)
  )
    return true;
  const edit = /^(?:med|intake):edit:(.+)$/.exec(key)?.[1];
  if (edit) return idPattern.test(edit);
  const day = /^(?:intake:new|checkin):(\d{4}-\d{2}-\d{2})$/.exec(key)?.[1];
  return Boolean(day && isValidDayKey(day));
}

export function safeRememberedDialog(
  value: unknown,
  path: string,
): RememberedDialog | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    item.id !== undefined &&
    (typeof item.id !== "string" || !idPattern.test(item.id))
  )
    return null;
  if (
    item.day !== undefined &&
    (typeof item.day !== "string" || !isValidDayKey(item.day))
  )
    return null;
  const id =
    typeof item.id === "string" && idPattern.test(item.id)
      ? item.id
      : undefined;
  const day =
    typeof item.day === "string" && isValidDayKey(item.day)
      ? item.day
      : undefined;
  const daily = path === "/" || /^\/history\/\d{4}-\d{2}-\d{2}$/.test(path);
  switch (item.kind) {
    case "intake-new":
      if (!daily || (path !== "/" && day !== path.slice(9))) return null;
      return day ? { kind: item.kind, day } : { kind: item.kind };
    case "intake-edit":
      return daily && id ? { kind: item.kind, id } : null;
    case "medication-new":
      return path === "/medications" ? { kind: item.kind } : null;
    case "medication-edit":
      return path === "/medications" && id ? { kind: item.kind, id } : null;
    case "goal-new":
      return path === "/goals" ? { kind: item.kind } : null;
    case "check-in":
      return daily && day ? { kind: item.kind, day } : null;
    case "preferences":
      return path === "/history" ? { kind: item.kind } : null;
    default:
      return null;
  }
}

export function sameRememberedDialog(
  a: RememberedDialog | null,
  b: RememberedDialog | null,
) {
  return a?.kind === b?.kind && a?.id === b?.id && a?.day === b?.day;
}

export function shouldRestoreLastScreen({
  pathname,
  search,
  hash,
  savedPath,
  guidePending,
  referrer,
  origin,
}: {
  pathname: string;
  search: string;
  hash: string;
  savedPath: string;
  guidePending: boolean;
  referrer?: string;
  origin?: string;
}) {
  if (guidePending || pathname !== "/" || search || hash || savedPath === "/")
    return false;
  if (!safeWorkspacePath(savedPath)) return false;
  if (referrer && origin) {
    try {
      const from = new URL(referrer);
      if (
        from.origin === origin &&
        from.pathname !== "/login" &&
        safeWorkspacePath(from.pathname)
      )
        return false;
    } catch {
      /* A missing or unavailable referrer does not block app resume. */
    }
  }
  return true;
}

function plain(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function validJson(value: unknown, depth = 0): boolean {
  if (depth > 10) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value))
    return (
      value.length <= 512 && value.every((item) => validJson(item, depth + 1))
    );
  return (
    plain(value) &&
    Object.entries(value).length <= 128 &&
    Object.entries(value).every(
      ([key, item]) =>
        !/^(?:__proto__|prototype|constructor|password|token|secret|credential)$/i.test(
          key,
        ) &&
        (item === undefined || validJson(item, depth + 1)),
    )
  );
}
function fresh(scope: string): SavedWorkspace {
  return { version: 1, scope, drafts: {}, screens: {}, lastPath: "/" };
}
function parseWorkspace(
  raw: string,
  scope: string,
): { workspace: SavedWorkspace; damaged: boolean } | null {
  if (raw.length > MAX_WORKSPACE) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !plain(value) ||
      value.version !== 1 ||
      value.scope !== scope ||
      !plain(value.drafts) ||
      !plain(value.screens)
    )
      return null;
    if (
      Object.keys(value.drafts).length > MAX_DRAFTS ||
      Object.keys(value.screens).length > MAX_SCREENS
    )
      return null;
    const result = fresh(scope);
    let damaged = false;
    for (const [key, draft] of Object.entries(value.drafts)) {
      if (
        !safeDraftKey(key) ||
        !plain(draft) ||
        !validJson(draft.value) ||
        JSON.stringify(draft.value).length > MAX_DRAFT
      ) {
        damaged = true;
        continue;
      }
      if (
        typeof draft.updatedAt !== "number" ||
        !Number.isFinite(draft.updatedAt)
      ) {
        damaged = true;
        continue;
      }
      result.drafts[key] = { value: draft.value, updatedAt: draft.updatedAt };
    }
    for (const [path, screen] of Object.entries(value.screens)) {
      if (!safeWorkspacePath(path) || !plain(screen)) {
        damaged = true;
        continue;
      }
      const dialog = safeRememberedDialog(screen.dialog, path);
      if (screen.dialog !== null && !dialog) damaged = true;
      result.screens[path] = {
        dialog,
        dialogInstance:
          typeof screen.dialogInstance === "number" &&
          Number.isSafeInteger(screen.dialogInstance)
            ? screen.dialogInstance
            : 0,
        hash: safeWorkspaceHash(screen.hash),
        scrollY:
          typeof screen.scrollY === "number" && Number.isFinite(screen.scrollY)
            ? Math.max(0, Math.min(screen.scrollY, 100_000))
            : 0,
        updatedAt:
          typeof screen.updatedAt === "number" &&
          Number.isFinite(screen.updatedAt)
            ? screen.updatedAt
            : 0,
      };
    }
    result.lastPath = safeWorkspacePath(value.lastPath) ?? "/";
    return { workspace: result, damaged };
  } catch {
    return null;
  }
}

/** One origin-local namespace per verified journal, with no credential material. */
export function createDraftWorkspace(scope: string) {
  if (!idPattern.test(scope)) throw new Error("Invalid draft namespace.");
  const key = `pill-happens:workspace:v1:${scope}`;
  let storage: DraftStorage | null = null;
  let state: WorkspaceSnapshot = {
    ...fresh(scope),
    hydrated: false,
    ready: false,
    status: "memory",
  };
  const serverState = state;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const serialized = () =>
    JSON.stringify({
      version: state.version,
      scope,
      drafts: state.drafts,
      screens: state.screens,
      lastPath: state.lastPath,
    });
  const persist = (preserveError = false) => {
    const previousStatus = state.status;
    let status: DraftStorageStatus = "memory";
    try {
      const raw = serialized();
      if (
        raw.length > MAX_WORKSPACE ||
        Object.keys(state.drafts).length > MAX_DRAFTS
      )
        throw new Error("Draft storage is full.");
      if (storage) {
        storage.setItem(key, raw);
        status =
          preserveError && previousStatus === "error" ? "error" : "saved";
      }
    } catch {
      status = "error";
    }
    state = { ...state, status };
    emit();
  };
  const screen = (path: string): ScreenRecord =>
    state.screens[path] ?? {
      dialog: null,
      dialogInstance: 0,
      hash: "",
      scrollY: 0,
      updatedAt: 0,
    };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => serverState,
    hydrate(candidate: DraftStorage | null) {
      if (state.hydrated) return;
      storage = candidate;
      let saved = fresh(scope);
      let status: DraftStorageStatus = candidate ? "saved" : "memory";
      try {
        const raw = candidate?.getItem(key);
        if (raw) {
          const parsed = parseWorkspace(raw, scope);
          if (parsed) {
            saved = parsed.workspace;
            if (parsed.damaged) status = "error";
          } else status = "error";
        }
      } catch {
        storage = null;
        status = "memory";
      }
      state = { ...saved, hydrated: true, ready: false, status };
      emit();
    },
    completeBootstrap() {
      state = { ...state, ready: true };
      emit();
    },
    setDraft(draftKey: string, value: unknown) {
      if (
        !safeDraftKey(draftKey) ||
        !validJson(value) ||
        JSON.stringify(value).length > MAX_DRAFT
      ) {
        state = { ...state, status: "error" };
        emit();
        return false;
      }
      state = {
        ...state,
        drafts: {
          ...state.drafts,
          [draftKey]: {
            value: JSON.parse(JSON.stringify(value)),
            updatedAt: Date.now(),
          },
        },
      };
      persist();
      return state.status === "saved";
    },
    clearDraft(draftKey: string) {
      const drafts = { ...state.drafts };
      delete drafts[draftKey];
      state = { ...state, drafts };
      persist();
    },
    setLocation(path: string, hash: string, scrollY: number) {
      if (!safeWorkspacePath(path)) return;
      const screens = {
        ...state.screens,
        [path]: {
          ...screen(path),
          hash: safeWorkspaceHash(hash),
          scrollY: Math.max(
            0,
            Math.min(Number.isFinite(scrollY) ? scrollY : 0, 100_000),
          ),
          updatedAt: Date.now(),
        },
      };
      if (Object.keys(screens).length > MAX_SCREENS) {
        const oldest = Object.keys(screens)
          .filter((item) => item !== path)
          .sort((a, b) => screens[a].updatedAt - screens[b].updatedAt)[0];
        if (oldest) delete screens[oldest];
      }
      state = { ...state, screens, lastPath: path };
      persist(true);
    },
    openDialog(path: string, dialog: RememberedDialog) {
      const safe = safeRememberedDialog(dialog, path);
      if (!safe) return;
      const previous = screen(path);
      state = {
        ...state,
        lastPath: path,
        screens: {
          ...state.screens,
          [path]: {
            ...previous,
            dialog: safe,
            dialogInstance:
              (previous.dialogInstance % Number.MAX_SAFE_INTEGER) + 1,
            updatedAt: Date.now(),
          },
        },
      };
      persist(true);
    },
    closeDialog(path: string, expected?: RememberedDialog, instance?: number) {
      const current = screen(path);
      if (
        expected &&
        (!sameRememberedDialog(current.dialog, expected) ||
          current.dialogInstance !== instance)
      )
        return;
      state = {
        ...state,
        screens: {
          ...state.screens,
          [path]: {
            ...current,
            dialog: null,
            dialogInstance:
              (current.dialogInstance % Number.MAX_SAFE_INTEGER) + 1,
            updatedAt: Date.now(),
          },
        },
      };
      persist(true);
    },
    flush: () => persist(true),
  };
}

export type DraftWorkspace = ReturnType<typeof createDraftWorkspace>;
