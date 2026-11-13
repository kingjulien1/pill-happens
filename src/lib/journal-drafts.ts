import { isValidDayKey } from "@/lib/domain";
import { MEDICATION_CATEGORIES } from "@/lib/medication-categories";
import { decodeJournalReferenceId } from "@/lib/journal-mentions";
import { isStreakMilestoneTarget } from "@/lib/streak-milestones";
import type { IntakeStackView } from "@/lib/intake-stack-layout";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import { checkInDraftKey } from "@/lib/check-in-draft";
import { isCheckInOpenedTimestamp } from "@/lib/check-in-logged-time";

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
  period?: DailyCheckInPeriod;
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
export type RememberedStackDay = {
  heads: string[];
  expanded: string[];
  updatedAt: number;
};
export type RememberedDialogScroll = {
  top: number;
  left: number;
  updatedAt: number;
};
type SavedWorkspace = {
  version: 1;
  scope: string;
  drafts: Record<string, DraftRecord>;
  screens: Record<string, ScreenRecord>;
  stackViews: Record<string, RememberedStackDay>;
  scrollViews: Record<string, RememberedDialogScroll>;
  /** First observed opening per draft identity; independent of saved content. */
  checkInOpenedAt: Record<string, number>;
  lastPath: string;
};
export type WorkspaceSnapshot = SavedWorkspace & {
  hydrated: boolean;
  ready: boolean;
  status: DraftStorageStatus;
};
export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

/** Serialized UTF-8 budgets, independently of browser-specific storage quotas. */
export const DRAFT_STORAGE_LIMITS = {
  workspace: 2_097_152,
  draft: 65_536,
  checkInDraft: 786_432,
} as const;
const MAX_WORKSPACE = DRAFT_STORAGE_LIMITS.workspace;
const MAX_DRAFTS = 128;
const MAX_SCREENS = 64;
const MAX_DIALOG_SCROLLS = 256;
const MAX_STACK_DAYS = 60;
const MAX_STACK_DAY = 65_536;
const MAX_STACK_VIEWS = 262_144;
const MAX_STACK_IDS = 2_048;
/** Over eleven years of two check-ins daily; existing history is never evicted. */
export const CHECK_IN_OPENED_AT_LIMIT = 8_192;
const encoder = new TextEncoder();
const utf8Length = (value: string) => encoder.encode(value).byteLength;
const jsonBytes = (value: unknown) => utf8Length(JSON.stringify(value));

function draftByteLimit(key: string) {
  return /^checkin:\d{4}-\d{2}-\d{2}(?::morning)?$/.test(key)
    ? DRAFT_STORAGE_LIMITS.checkInDraft
    : DRAFT_STORAGE_LIMITS.draft;
}
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const ordinaryPaths = new Set([
  "/",
  "/medications",
  "/history",
  "/journal",
  "/goals",
  "/streaks",
  "/guide",
  "/developer-guide",
]);

export function safeWorkspacePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  if (ordinaryPaths.has(value)) return value;
  const day = /^\/history\/(\d{4}-\d{2}-\d{2})$/.exec(value)?.[1];
  if (day && isValidDayKey(day)) return value;
  const week = /^\/history\/weeks\/(\d{4}-\d{2}-\d{2})$/.exec(value)?.[1];
  if (
    week &&
    isValidDayKey(week) &&
    new Date(`${week}T12:00:00Z`).getUTCDay() === 1
  )
    return value;
  const journal = /^\/journal\/(\d{4}-\d{2}-\d{2})\/(?:morning|evening)$/.exec(
    value,
  )?.[1];
  if (journal && isValidDayKey(journal)) return value;
  const category = /^\/medications\/categories\/([a-z-]+)$/.exec(value)?.[1];
  if (category && MEDICATION_CATEGORIES.some((item) => item.value === category))
    return value;
  const medication = /^\/medications\/([^/?#]+)$/.exec(value)?.[1];
  if (medication) {
    return decodeJournalReferenceId(medication) ? value : null;
  }
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
      "view:guide-colors",
      "view:history",
    ].includes(key)
  )
    return true;
  const edit = /^(?:med|intake):edit:(.+)$/.exec(key)?.[1];
  if (edit) return idPattern.test(edit);
  const day =
    /^(?:intake:new|checkin):(\d{4}-\d{2}-\d{2})$/.exec(key)?.[1] ??
    /^checkin:(\d{4}-\d{2}-\d{2}):morning$/.exec(key)?.[1];
  return Boolean(day && isValidDayKey(day));
}

function safeCheckInOpenedKey(key: string) {
  const day = /^checkin:(\d{4}-\d{2}-\d{2})(?::morning)?$/.exec(key)?.[1];
  return Boolean(day && isValidDayKey(day));
}

/** Route and explicit form identity keep editors and dates independent. */
export function dialogScrollKey(path: string, identity: string) {
  return safeWorkspacePath(path) &&
    /^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/.test(identity)
    ? `${path}|${identity}`
    : null;
}
function safeDialogScrollKey(key: string) {
  const separator = key.indexOf("|");
  return (
    separator > 0 &&
    dialogScrollKey(key.slice(0, separator), key.slice(separator + 1)) === key
  );
}
function dialogScrollRecord(value: unknown): RememberedDialogScroll | null {
  if (!plain(value)) return null;
  if (
    typeof value.top !== "number" ||
    !Number.isFinite(value.top) ||
    typeof value.left !== "number" ||
    !Number.isFinite(value.left) ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt)
  )
    return null;
  return {
    top: Math.max(0, Math.min(value.top, 10_000_000)),
    left: Math.max(0, Math.min(value.left, 10_000_000)),
    updatedAt: value.updatedAt,
  };
}
function boundedDialogScrolls(
  views: Record<string, RememberedDialogScroll>,
  keep?: string,
) {
  return Object.fromEntries(
    Object.entries(views)
      .sort(
        ([a, x], [b, y]) =>
          Number(b === keep) - Number(a === keep) ||
          y.updatedAt - x.updatedAt ||
          a.localeCompare(b),
      )
      .slice(0, MAX_DIALOG_SCROLLS),
  );
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
      if (
        !daily ||
        !day ||
        (item.period !== undefined &&
          item.period !== "morning" &&
          item.period !== "evening")
      )
        return null;
      return item.period === "morning"
        ? { kind: item.kind, day, period: "morning" }
        : { kind: item.kind, day };
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
  return (
    a?.kind === b?.kind &&
    a?.id === b?.id &&
    a?.day === b?.day &&
    (a?.kind !== "check-in" ||
      (a.period ?? "evening") === (b?.period ?? "evening"))
  );
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
  return {
    version: 1,
    scope,
    drafts: {},
    screens: {},
    stackViews: {},
    scrollViews: {},
    checkInOpenedAt: {},
    lastPath: "/",
  };
}

function safeStackIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_STACK_IDS &&
    value.every((id) => typeof id === "string" && idPattern.test(id))
  );
}

function stackViewRecord(value: unknown): RememberedStackDay | null {
  if (
    !plain(value) ||
    !safeStackIds(value.heads) ||
    !safeStackIds(value.expanded) ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt)
  )
    return null;
  const heads = [...new Set(value.heads)];
  const headSet = new Set(heads);
  if (!value.expanded.every((id) => headSet.has(id))) return null;
  const record = {
    heads,
    expanded: [...new Set(value.expanded)],
    updatedAt: value.updatedAt,
  };
  return jsonBytes(record) <= MAX_STACK_DAY ? record : null;
}

/** Recently used day views have a separate budget; form drafts are never evicted. */
function boundedStackViews(
  views: Record<string, RememberedStackDay>,
  keep?: string,
): Record<string, RememberedStackDay> {
  const days = Object.keys(views).sort((a, b) =>
    a === keep
      ? -1
      : b === keep
        ? 1
        : views[b].updatedAt - views[a].updatedAt || b.localeCompare(a),
  );
  const result: Record<string, RememberedStackDay> = {};
  for (const day of days.slice(0, MAX_STACK_DAYS)) result[day] = views[day];
  while (jsonBytes(result) > MAX_STACK_VIEWS) {
    const oldest = Object.keys(result).at(-1);
    if (!oldest || oldest === keep) break;
    delete result[oldest];
  }
  return result;
}
function parseWorkspace(
  raw: string,
  scope: string,
): { workspace: SavedWorkspace; damaged: boolean } | null {
  if (raw.length > MAX_WORKSPACE || utf8Length(raw) > MAX_WORKSPACE)
    return null;
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
        jsonBytes(draft.value) > draftByteLimit(key)
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
    // Optional in version1: previously saved forms/routes remain compatible.
    if (value.stackViews !== undefined) {
      if (!plain(value.stackViews)) damaged = true;
      else {
        for (const [day, rawView] of Object.entries(value.stackViews)) {
          const view = stackViewRecord(rawView);
          if (!isValidDayKey(day) || !view) {
            damaged = true;
            continue;
          }
          result.stackViews[day] = view;
        }
        const bounded = boundedStackViews(result.stackViews);
        if (
          Object.keys(bounded).length !== Object.keys(result.stackViews).length
        )
          damaged = true;
        result.stackViews = bounded;
      }
    }
    // Optional in version1, so existing form drafts remain fully compatible.
    if (value.scrollViews !== undefined) {
      if (!plain(value.scrollViews)) damaged = true;
      else {
        for (const [key, rawView] of Object.entries(value.scrollViews)) {
          const view = dialogScrollRecord(rawView);
          if (!safeDialogScrollKey(key) || !view) {
            damaged = true;
            continue;
          }
          result.scrollViews[key] = view;
        }
        const bounded = boundedDialogScrolls(result.scrollViews);
        if (
          Object.keys(bounded).length !== Object.keys(result.scrollViews).length
        )
          damaged = true;
        result.scrollViews = bounded;
      }
    }
    // Optional in version 1. Creation/save timestamps do not establish an open.
    if (value.checkInOpenedAt !== undefined) {
      if (!plain(value.checkInOpenedAt)) damaged = true;
      else {
        const observations: [string, number][] = [];
        for (const [key, openedAt] of Object.entries(value.checkInOpenedAt)) {
          if (
            !safeCheckInOpenedKey(key) ||
            !isCheckInOpenedTimestamp(openedAt)
          ) {
            damaged = true;
            continue;
          }
          observations.push([key, openedAt]);
        }
        if (observations.length > CHECK_IN_OPENED_AT_LIMIT) damaged = true;
        result.checkInOpenedAt = Object.fromEntries(
          observations
            .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
            .slice(0, CHECK_IN_OPENED_AT_LIMIT),
        );
      }
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
      stackViews: state.stackViews,
      scrollViews: state.scrollViews,
      checkInOpenedAt: state.checkInOpenedAt,
      lastPath: state.lastPath,
    });
  const persist = (preserveError = false, notify = true) => {
    const previousStatus = state.status;
    let status: DraftStorageStatus = "memory";
    try {
      const raw = serialized();
      if (
        utf8Length(raw) > MAX_WORKSPACE ||
        Object.keys(state.drafts).length > MAX_DRAFTS ||
        Object.entries(state.drafts).some(
          ([key, draft]) => jsonBytes(draft.value) > draftByteLimit(key),
        )
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
    if (notify || status !== previousStatus) emit();
  };
  const screen = (path: string): ScreenRecord =>
    state.screens[path] ?? {
      dialog: null,
      dialogInstance: 0,
      hash: "",
      scrollY: 0,
      updatedAt: 0,
    };
  const observeCheckInOpened = (
    dialog: RememberedDialog | null,
    observedAt: number,
  ) => {
    if (
      dialog?.kind !== "check-in" ||
      !dialog.day ||
      !isValidDayKey(dialog.day) ||
      (dialog.period !== undefined &&
        dialog.period !== "morning" &&
        dialog.period !== "evening") ||
      !isCheckInOpenedTimestamp(observedAt)
    )
      return;
    const identity = checkInDraftKey(dialog.day, dialog.period);
    if (state.checkInOpenedAt[identity] !== undefined) return;
    if (Object.keys(state.checkInOpenedAt).length >= CHECK_IN_OPENED_AT_LIMIT) {
      // Do not silently discard an earlier first-open observation to make room.
      state = { ...state, status: "error" };
      return;
    }
    state = {
      ...state,
      checkInOpenedAt: { ...state.checkInOpenedAt, [identity]: observedAt },
    };
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
      if (!safeDraftKey(draftKey) || !validJson(value)) {
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
      // Keep valid edits in this visit even when their byte budget or the browser
      // quota prevents persistence. A later write rechecks every draft budget.
      persist();
      return state.status === "saved";
    },
    clearDraft(draftKey: string) {
      const drafts = { ...state.drafts };
      delete drafts[draftKey];
      state = { ...state, drafts };
      persist();
    },
    setStackView(
      day: string,
      memberIds: readonly string[],
      view: IntakeStackView,
    ) {
      if (
        !isValidDayKey(day) ||
        !safeStackIds(memberIds) ||
        !safeStackIds(view.heads) ||
        !safeStackIds(view.expanded)
      ) {
        state = { ...state, status: "error" };
        emit();
        return false;
      }
      const members = new Set(memberIds);
      if (
        view.heads.some((id) => !members.has(id)) ||
        view.expanded.some((id) => !view.heads.includes(id))
      ) {
        state = { ...state, status: "error" };
        emit();
        return false;
      }
      const previous = state.stackViews[day];
      const next = stackViewRecord({
        heads: [
          ...(previous?.heads ?? []).filter((id) => !members.has(id)),
          ...view.heads,
        ],
        expanded: [
          ...(previous?.expanded ?? []).filter((id) => !members.has(id)),
          ...view.expanded,
        ],
        updatedAt: Date.now(),
      });
      if (!next) {
        state = { ...state, status: "error" };
        emit();
        return false;
      }
      state = {
        ...state,
        stackViews: boundedStackViews(
          { ...state.stackViews, [day]: next },
          day,
        ),
      };
      // Presentation changes must not dismiss an unrelated damaged-form warning.
      persist(true);
      return state.status === "saved";
    },
    setDialogScroll(key: string, position: { top: number; left: number }) {
      const next = dialogScrollRecord({ ...position, updatedAt: Date.now() });
      if (!safeDialogScrollKey(key) || !next) return false;
      const previous = state.scrollViews[key];
      if (previous?.top === next.top && previous.left === next.left)
        return state.status === "saved";
      state = {
        ...state,
        scrollViews: boundedDialogScrolls(
          {
            ...state.scrollViews,
            [key]: next,
          },
          key,
        ),
      };
      // Numeric presentation memory should not rerender every form on scroll.
      // A real storage-status change still reaches the existing status notices.
      persist(true, false);
      return state.status === "saved";
    },
    setLocation(path: string, hash: string, scrollY: number) {
      if (!safeWorkspacePath(path)) return;
      const observedAt = Date.now();
      // Bootstrap/navigation observes only the screen actually being restored,
      // not every dormant dialog remembered elsewhere in the workspace.
      observeCheckInOpened(screen(path).dialog, observedAt);
      const screens = {
        ...state.screens,
        [path]: {
          ...screen(path),
          hash: safeWorkspaceHash(hash),
          scrollY: Math.max(
            0,
            Math.min(Number.isFinite(scrollY) ? scrollY : 0, 100_000),
          ),
          updatedAt: observedAt,
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
      if (!safeWorkspacePath(path)) return;
      const safe = safeRememberedDialog(dialog, path);
      if (!safe) return;
      const observedAt = Date.now();
      observeCheckInOpened(safe, observedAt);
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
            updatedAt: observedAt,
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
