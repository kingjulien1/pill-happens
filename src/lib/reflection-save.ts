export type ReflectionSaveStatus =
  | "saved"
  | "pending"
  | "saving"
  | "error"
  | "offline"
  | "conflict"
  | "cooldown"
  | "review";
export type ReflectionSaveControls = {
  status: ReflectionSaveStatus;
  canSave: boolean;
  onSave: () => void;
  message: string;
  lastSavedAt?: string;
};
export type ReflectionSaveInput = {
  day: string;
  period: "morning" | "evening";
  note: string;
  expectedUpdatedAt: string | null;
};
export type ReflectionSaveAcknowledgement = {
  note: string;
  updatedAt: string | null;
};
export class ReflectionSaveError extends Error {
  constructor(
    message: string,
    public status = 0,
    public retryAt: number | null = null,
    public kind: "http" | "network" | "busy" = "http",
  ) {
    super(message);
  }
}

export function reflectionRetryAt(
  value: string | null,
  now: number,
): number | null {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    const at = now + seconds * 1000;
    return seconds >= 0 && Number.isFinite(at) ? at : null;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(now, date) : null;
}
export function reflectionSaveDue(
  now: number,
  lastEdit: number,
  dirtySince: number,
  lastAttempt: number,
) {
  return Math.max(
    now,
    Math.min(lastEdit + 2000, dirtySince + 30_000),
    lastAttempt + 15_000,
  );
}
export const sameReflection = (a: string, b: string) =>
  a === b || (!a.trim() && !b.trim());

export function confirmReflectionAcknowledgement(
  note: string,
  saved: { note: unknown; updatedAt: unknown } | undefined,
): ReflectionSaveAcknowledgement {
  if (
    saved &&
    (typeof saved.note !== "string" ||
      typeof saved.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(saved.updatedAt)))
  )
    throw new ReflectionSaveError(
      "The writing save could not be confirmed. It is kept locally.",
      0,
      null,
      "network",
    );
  const savedNote = (saved?.note ?? "") as string;
  if (!sameReflection(note, savedNote))
    throw new ReflectionSaveError(
      "The journal returned a different writing version. Your draft is safe; review it before saving again.",
      409,
    );
  return {
    note: savedNote,
    updatedAt: (saved?.updatedAt ?? null) as string | null,
  };
}

export type ReflectionSaveStateInput = {
  note: string;
  savedNote: string;
  savedAt: string | null;
  baseUpdatedAt: string | null | undefined;
  enabled: boolean;
  busy: boolean;
  online: boolean;
};
type SaveSnapshot = Omit<ReflectionSaveControls, "onSave">;

/** Never present an older render's saved snapshot as a newly edited note. */
export function reflectionSaveDisplay(
  snapshot: SaveSnapshot,
  note: string,
  savedNote: string,
  online: boolean,
): SaveSnapshot {
  if (snapshot.status !== "saved") return snapshot;
  if (!online)
    return {
      ...snapshot,
      status: "offline",
      message: "Offline. Your writing is kept on this device.",
    };
  if (!sameReflection(note, savedNote))
    return {
      ...snapshot,
      status: "pending",
      message: "Writing changes are waiting to sync.",
    };
  return snapshot;
}

/** One coalesced writer; failures never create a polling/retry loop. */
export function createReflectionSaveController(options: {
  initial: ReflectionSaveStateInput;
  send: (
    note: string,
    expectedUpdatedAt: string | null,
  ) => Promise<ReflectionSaveAcknowledgement>;
  acknowledge: (updatedAt: string | null) => void;
  conflict?: () => void;
  now?: () => number;
  schedule?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let input = options.initial;
  let confirmedNote = input.savedNote;
  let version = input.savedAt;
  let known =
    sameReflection(input.note, confirmedNote) ||
    (input.baseUpdatedAt !== undefined && input.baseUpdatedAt === version);
  let fault: ReflectionSaveStatus | null = known ? null : "review";
  let errorMessage = "";
  let lastEdit = now();
  let dirtySince = lastEdit;
  let lastAttempt = -Infinity;
  let cooldownUntil = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flight: Promise<void> | null = null;
  let sentNote: string | null = null;
  let held = false;
  let disposed = false;
  const listeners = new Set<() => void>();
  const dirty = () => !sameReflection(input.note, confirmedNote);
  const snapshot = (): SaveSnapshot => {
    const status = flight
      ? "saving"
      : !dirty()
        ? "saved"
        : !input.online
          ? "offline"
          : (fault ?? "pending");
    const messages: Record<ReflectionSaveStatus, string> = {
      saved: "Writing is up to date in your journal.",
      pending: "Writing changes are waiting to save.",
      saving: "Saving writing to your journal…",
      offline: "Offline. Writing is still kept on this device.",
      error: errorMessage || "Writing is kept locally. Use Save to try again.",
      conflict:
        "The journal changed elsewhere. Your local writing is safe; use Save after reviewing it.",
      review:
        "A restored draft differs from the journal. Use Save to keep this version.",
      cooldown:
        now() < cooldownUntil
          ? "Please wait before saving again. Your writing is kept locally."
          : "Writing is kept locally. Save is ready to try again.",
    };
    return {
      status,
      canSave:
        dirty() &&
        !flight &&
        !held &&
        !input.busy &&
        input.online &&
        now() >= cooldownUntil,
      message: messages[status],
      ...(version ? { lastSavedAt: version } : {}),
    };
  };
  let state = snapshot();
  const emit = () => {
    if (!disposed) {
      state = snapshot();
      listeners.forEach((listener) => listener());
    }
  };
  const clearTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const arm = () => {
    clearTimer();
    if (!disposed && fault === "cooldown" && now() < cooldownUntil) {
      timer = schedule(
        () => {
          timer = null;
          emit();
        },
        Math.min(2_147_483_647, cooldownUntil - now()),
      );
      emit();
      return;
    }
    if (
      disposed ||
      held ||
      flight ||
      !dirty() ||
      !input.enabled ||
      input.busy ||
      !input.online ||
      !known ||
      fault
    ) {
      emit();
      return;
    }
    const at = reflectionSaveDue(now(), lastEdit, dirtySince, lastAttempt);
    timer = schedule(() => {
      timer = null;
      void request(false);
    }, at - now());
    emit();
  };
  const request = (manual: boolean): Promise<void> => {
    if (
      disposed ||
      held ||
      flight ||
      !dirty() ||
      input.busy ||
      !input.online ||
      now() < cooldownUntil ||
      (!manual && (!input.enabled || !known || fault))
    )
      return flight ?? Promise.resolve();
    clearTimer();
    if (manual) {
      if (fault === "review" || fault === "conflict") {
        version = input.savedAt;
        confirmedNote = input.savedNote;
      }
      known = true;
      fault = null;
    }
    const note = input.note;
    const expected = version;
    lastAttempt = now();
    sentNote = note;
    const work = (async () => {
      try {
        const acknowledged = await Promise.resolve().then(() =>
          options.send(note, expected),
        );
        if (disposed) return;
        confirmedNote = acknowledged.note;
        version = acknowledged.updatedAt;
        known = true;
        fault = null;
        cooldownUntil = 0;
        options.acknowledge(version);
      } catch (error) {
        if (disposed) return;
        const problem =
          error instanceof ReflectionSaveError
            ? error
            : new ReflectionSaveError(
                "Writing is kept locally. Use Save to try again.",
                0,
                null,
                "network",
              );
        errorMessage = problem.message;
        if (problem.kind === "busy") fault = null;
        else if (problem.status === 429) {
          fault = "cooldown";
          cooldownUntil = problem.retryAt ?? now() + 60_000;
          timer = schedule(
            () => {
              timer = null;
              emit();
            },
            Math.min(2_147_483_647, Math.max(0, cooldownUntil - now())),
          );
        } else if (problem.status === 409) {
          fault = "conflict";
          known = false;
          options.conflict?.();
        } else fault = input.online ? "error" : "offline";
      } finally {
        flight = null;
        sentNote = null;
        if (!disposed) {
          if (!dirty()) dirtySince = now();
          if (!fault) arm();
          else emit();
        }
      }
    })();
    flight = work;
    emit();
    return work;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    start() {
      disposed = false;
      arm();
    },
    update(next: ReflectionSaveStateInput) {
      if (disposed) return;
      const changed = next.note !== input.note;
      if (changed) {
        if (!dirty()) dirtySince = now();
        lastEdit = now();
        if (fault === "cooldown" && now() >= cooldownUntil) fault = null;
      }
      if (
        next.savedAt !== input.savedAt ||
        next.savedNote !== input.savedNote
      ) {
        if (sameReflection(next.savedNote, confirmedNote))
          version = next.savedAt;
        else if (
          sentNote !== null &&
          sameReflection(next.savedNote, sentNote)
        ) {
          /* The request acknowledgement follows this provider update. */
        } else if (sameReflection(next.note, next.savedNote)) {
          confirmedNote = next.savedNote;
          version = next.savedAt;
          known = true;
          fault = null;
        } else {
          confirmedNote = next.savedNote;
          version = next.savedAt;
          known = false;
          fault = "conflict";
        }
      }
      if (!flight && sameReflection(next.note, next.savedNote)) {
        confirmedNote = next.savedNote;
        version = next.savedAt;
        known = true;
        fault = null;
      }
      if (
        !flight &&
        next.baseUpdatedAt !== input.baseUpdatedAt &&
        (next.baseUpdatedAt === undefined || next.baseUpdatedAt !== version) &&
        !sameReflection(next.note, next.savedNote)
      ) {
        known = false;
        fault = "review";
      }
      input = next;
      arm();
    },
    save: () => request(true),
    online() {
      if (disposed) return;
      input = { ...input, online: true };
      if (fault === "offline" || fault === "error") fault = null;
      arm();
    },
    async pauseAndDrain() {
      held = true;
      clearTimer();
      emit();
      await flight;
    },
    resume() {
      held = false;
      arm();
    },
    dispose() {
      disposed = true;
      clearTimer();
      listeners.clear();
    },
  };
}
