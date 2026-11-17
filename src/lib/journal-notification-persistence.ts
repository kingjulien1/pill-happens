import {
  isNotificationClockCheckpoint,
  type NotificationClockCheckpoint,
  type NotificationId,
} from "./journal-notification-lifecycle";

export type NotificationJsonValue =
  | null
  | boolean
  | number
  | string
  | NotificationJsonValue[]
  | { [key: string]: NotificationJsonValue };
export type NotificationJsonObject = {
  [key: string]: NotificationJsonValue;
};

/** Descriptors contain data/commands only; callbacks and React nodes stay live. */
export type PersistedJournalNotification<T = NotificationJsonObject> = {
  id: NotificationId;
  descriptor: T;
  clock: NotificationClockCheckpoint;
  /** Fixed for one notification generation; same-ID replacements get a new one. */
  createdAt: number;
  updatedAt: number;
};

type NotificationEnvelope<T> = {
  version: 1;
  scope: string;
  generation: number;
  clearedAt: number;
  tombstones: { id: NotificationId; updatedAt: number }[];
  notifications: PersistedJournalNotification<T>[];
};

export type NotificationStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export type NotificationPersistenceError =
  | "invalid-record"
  | "invalid-saved-data"
  | "payload-too-large"
  | "stale-generation"
  | "read-failed"
  | "write-failed";
export type NotificationPersistenceResult<T> = {
  status: "saved" | "memory" | "error";
  records: PersistedJournalNotification<T>[];
  error?: NotificationPersistenceError;
};

/** A byte budget, never a notification count cap or an eviction policy. */
export const NOTIFICATION_STORAGE_MAX_BYTES = 2_097_152;
const scopePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const encoder = new TextEncoder();

function isObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Rejects silent JSON data loss (functions, undefined, Dates, cycles, NaN). */
export function isNotificationJsonValue(
  value: unknown,
): value is NotificationJsonValue {
  const ancestors = new Set<object>();
  const visit = (candidate: unknown, depth: number): boolean => {
    if (candidate === null) return true;
    if (typeof candidate === "string" || typeof candidate === "boolean")
      return true;
    if (typeof candidate === "number") return Number.isFinite(candidate);
    if (typeof candidate !== "object" || depth > 64) return false;
    if (!Array.isArray(candidate) && !isObject(candidate)) return false;
    if (ancestors.has(candidate)) return false;
    ancestors.add(candidate);
    const descriptors = Object.getOwnPropertyDescriptors(candidate);
    const entries = Object.entries(descriptors);
    const valid =
      Object.getOwnPropertySymbols(candidate).length === 0 &&
      (!Array.isArray(candidate) || entries.length === candidate.length + 1) &&
      entries.every(([key, descriptor]) => {
        if (Array.isArray(candidate) && key === "length") return true;
        if (
          Array.isArray(candidate) &&
          (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= candidate.length)
        )
          return false;
        return (
          descriptor.enumerable === true &&
          "value" in descriptor &&
          visit(descriptor.value, depth + 1)
        );
      });
    ancestors.delete(candidate);
    return valid;
  };
  try {
    return visit(value, 0);
  } catch {
    return false;
  }
}

function validId(value: unknown): value is NotificationId {
  return (
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function validTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validRecord<T>(
  value: unknown,
  validateDescriptor?: (value: unknown) => value is T,
): value is PersistedJournalNotification<T> {
  if (!isObject(value)) return false;
  return (
    isNotificationJsonValue(value) &&
    validId(value.id) &&
    isNotificationClockCheckpoint(value.clock) &&
    validTimestamp(value.createdAt) &&
    value.createdAt > 0 &&
    validTimestamp(value.updatedAt) &&
    value.updatedAt >= value.createdAt &&
    isObject(value.descriptor) &&
    isNotificationJsonValue(value.descriptor) &&
    (!validateDescriptor || validateDescriptor(value.descriptor))
  );
}

export function journalNotificationStorageKey(scope: string) {
  if (!scopePattern.test(scope))
    throw new RangeError("Invalid notification journal namespace.");
  return `pill-happens:notifications:v1:${scope}`;
}

/** A corrupt/wrong-journal envelope is never silently replaced by an empty one. */
export function parseJournalNotifications<T = NotificationJsonObject>(
  raw: string,
  scope: string,
  validateDescriptor?: (value: unknown) => value is T,
): PersistedJournalNotification<T>[] | null {
  return parseEnvelope(raw, scope, validateDescriptor)?.notifications ?? null;
}

function parseEnvelope<T>(
  raw: string,
  scope: string,
  validateDescriptor?: (value: unknown) => value is T,
): NotificationEnvelope<T> | null {
  try {
    if (encoder.encode(raw).byteLength > NOTIFICATION_STORAGE_MAX_BYTES)
      return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isObject(value) ||
      value.version !== 1 ||
      value.scope !== scope ||
      !Number.isSafeInteger(value.generation) ||
      (value.generation as number) < 0 ||
      !validTimestamp(value.clearedAt) ||
      !Array.isArray(value.tombstones) ||
      !Array.isArray(value.notifications)
    )
      return null;
    const tombstones = new Map<NotificationId, number>();
    for (const tombstone of value.tombstones) {
      if (
        !isObject(tombstone) ||
        !validId(tombstone.id) ||
        !validTimestamp(tombstone.updatedAt) ||
        tombstones.has(tombstone.id)
      )
        return null;
      tombstones.set(tombstone.id, tombstone.updatedAt);
    }
    const ids = new Set<NotificationId>();
    for (const record of value.notifications) {
      if (
        !validRecord(record, validateDescriptor) ||
        ids.has(record.id) ||
        record.createdAt <= value.clearedAt ||
        record.createdAt <= (tombstones.get(record.id) ?? -1)
      )
        return null;
      ids.add(record.id);
    }
    return value as NotificationEnvelope<T>;
  } catch {
    return null;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function browserStorage(): NotificationStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * One journal per key. Pending writes survive quota/security failures in memory;
 * retries merge the latest shared namespace rather than overwriting other IDs.
 */
export function createJournalNotificationStore<T = NotificationJsonObject>(
  scope: string,
  options: {
    storage?: NotificationStorage | null;
    validateDescriptor?: (value: unknown) => value is T;
  } = {},
) {
  const key = journalNotificationStorageKey(scope);
  const storage =
    options.storage === undefined ? browserStorage() : options.storage;
  const fresh = (): NotificationEnvelope<T> => ({
    version: 1,
    scope,
    generation: 0,
    clearedAt: 0,
    tombstones: [],
    notifications: [],
  });
  let base = fresh();
  let generation: number | undefined;
  const pending = new Map<
    NotificationId,
    | { kind: "upsert"; record: PersistedJournalNotification<T> }
    | { kind: "remove"; updatedAt: number; createdAt?: number }
  >();
  let pendingClear: number | null = null;

  const merged = () => {
    if (pendingClear !== null)
      return {
        ...base,
        generation: base.generation + 1,
        clearedAt: Math.max(
          pendingClear,
          base.clearedAt,
          base.notifications.reduce(
            (latest, record) => Math.max(latest, record.createdAt),
            0,
          ),
          base.tombstones.reduce(
            (latest, record) => Math.max(latest, record.updatedAt),
            0,
          ),
        ),
        tombstones: [],
        notifications: [],
      };
    // Reading a cleared namespace cannot authorize an old live queue to return.
    if (generation !== undefined && generation !== base.generation) return base;
    const records = new Map(
      base.notifications.map((record) => [record.id, record]),
    );
    const tombstones = new Map(
      base.tombstones.map((record) => [record.id, record.updatedAt]),
    );
    for (const [id, change] of pending) {
      const previous = records.get(id);
      if (change.kind === "remove") {
        if (
          previous &&
          ((change.createdAt !== undefined &&
            previous.createdAt !== change.createdAt) ||
            previous.createdAt > change.updatedAt)
        )
          continue;
        records.delete(id);
        tombstones.set(id, Math.max(change.updatedAt, tombstones.get(id) ?? 0));
        continue;
      }
      let record = change.record;
      if (
        record.createdAt <= base.clearedAt ||
        record.createdAt <= (tombstones.get(id) ?? -1) ||
        (previous &&
          (record.createdAt < previous.createdAt ||
            (record.createdAt === previous.createdAt &&
              record.updatedAt < previous.updatedAt)))
      )
        continue;
      if (previous && record.createdAt === previous.createdAt) {
        // Checkpoints advance one generation; only a new generation may restart.
        if (
          JSON.stringify(record.descriptor) !==
            JSON.stringify(previous.descriptor) ||
          record.clock.duration !== previous.clock.duration
        )
          continue;
        if (record.clock.elapsedActive < previous.clock.elapsedActive)
          record = { ...record, clock: previous.clock };
      }
      records.set(id, record);
    }
    return {
      ...base,
      notifications: [...records.values()],
      tombstones: [...tombstones].map(([id, updatedAt]) => ({ id, updatedAt })),
    };
  };
  const result = (
    error?: NotificationPersistenceError,
  ): NotificationPersistenceResult<T> => ({
    status: error ? "error" : storage ? "saved" : "memory",
    records: clone(merged().notifications),
    ...(error ? { error } : {}),
  });
  const refresh = (): NotificationPersistenceError | undefined => {
    if (!storage) return;
    try {
      const raw = storage.getItem(key);
      if (raw === null) base = fresh();
      else {
        const parsed = parseEnvelope(raw, scope, options.validateDescriptor);
        if (!parsed) return "invalid-saved-data";
        base = parsed;
      }
      generation ??= base.generation;
    } catch {
      return "read-failed";
    }
  };
  const flush = (): NotificationPersistenceResult<T> => {
    const readError = refresh();
    if (readError && pendingClear === null) return result(readError);
    if (
      pendingClear === null &&
      generation !== undefined &&
      generation !== base.generation
    )
      return result("stale-generation");
    const envelope = merged();
    const raw = JSON.stringify(envelope);
    if (encoder.encode(raw).byteLength > NOTIFICATION_STORAGE_MAX_BYTES)
      return result("payload-too-large");
    if (storage) {
      try {
        storage.setItem(key, raw);
      } catch {
        return result("write-failed");
      }
    }
    base = envelope;
    generation = base.generation;
    pending.clear();
    pendingClear = null;
    return result();
  };

  return {
    key,
    read() {
      return result(refresh());
    },
    upsert(record: PersistedJournalNotification<T>) {
      try {
        if (!validRecord(record, options.validateDescriptor))
          return result("invalid-record");
        pending.set(record.id, { kind: "upsert", record: clone(record) });
      } catch {
        return result("invalid-record");
      }
      return flush();
    },
    remove(id: NotificationId, updatedAt = Date.now(), createdAt?: number) {
      if (
        !validId(id) ||
        !validTimestamp(updatedAt) ||
        (createdAt !== undefined && !validTimestamp(createdAt))
      )
        return result("invalid-record");
      pending.set(id, { kind: "remove", updatedAt, createdAt });
      return flush();
    },
    /** Explicitly clears only this journal; no origin-wide clear is used. */
    clear(updatedAt = Date.now()) {
      if (!validTimestamp(updatedAt)) return result("invalid-record");
      pendingClear = updatedAt;
      pending.clear();
      return flush();
    },
    flush,
  };
}
