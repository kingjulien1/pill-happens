import test from "node:test";
import assert from "node:assert/strict";
import { NotificationClock } from "./journal-notification-lifecycle";
import {
  createJournalNotificationStore,
  isNotificationJsonValue,
  journalNotificationStorageKey,
  NOTIFICATION_STORAGE_MAX_BYTES,
  parseJournalNotifications,
  type NotificationStorage,
  type PersistedJournalNotification,
} from "./journal-notification-persistence";

type Descriptor = { kind: "success" | "loading"; heading: string };
const isDescriptor = (value: unknown): value is Descriptor => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Descriptor>;
  return (
    (candidate.kind === "success" || candidate.kind === "loading") &&
    typeof candidate.heading === "string"
  );
};
function record(
  id: string | number,
  elapsed = 0,
): PersistedJournalNotification<Descriptor> {
  let now = 0;
  const clock = new NotificationClock(7_000, () => now);
  now = elapsed;
  return {
    id,
    descriptor: { kind: "success", heading: `Saved ${id}` },
    clock: clock.checkpoint(),
    createdAt: 100,
    updatedAt: 100,
  };
}
function memoryStorage() {
  const values = new Map<string, string>();
  let failure: "read" | "write" | undefined;
  const storage: NotificationStorage = {
    getItem(key) {
      if (failure === "read") throw new Error("Blocked read");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (failure === "write") throw new Error("Quota exceeded");
      values.set(key, value);
    },
    removeItem(key) {
      if (failure === "write") throw new Error("Blocked removal");
      values.delete(key);
    },
  };
  return {
    storage,
    values,
    fail: (value?: typeof failure) => (failure = value),
  };
}

test("round trips exact independent countdowns and descriptor data without a notification count cap", () => {
  const { storage } = memoryStorage();
  const store = createJournalNotificationStore("journal_a", {
    storage,
    validateDescriptor: isDescriptor,
  });
  for (let index = 0; index < 21; index++)
    assert.equal(store.upsert(record(index, index * 100)).status, "saved");
  const reloaded = createJournalNotificationStore("journal_a", {
    storage,
    validateDescriptor: isDescriptor,
  }).read();
  assert.equal(reloaded.records.length, 21);
  for (let index = 0; index < 21; index++)
    assert.deepEqual(reloaded.records[index], record(index, index * 100));
});

test("journal namespaces isolate notifications and clear/remove never touch another journal", () => {
  const { storage, values } = memoryStorage();
  const first = createJournalNotificationStore("journal_a", { storage });
  const second = createJournalNotificationStore("journal_b", { storage });
  first.upsert(record("same"));
  second.upsert(record("same", 600));
  const savedSecond = values.get(second.key);
  first.remove("same");
  assert.equal(values.get(second.key), savedSecond);
  first.upsert(record("again"));
  first.clear();
  assert.equal(values.has(first.key), true);
  assert.deepEqual(first.read().records, []);
  assert.equal(second.read().records[0].clock.elapsedActive, 600);
  assert.throws(() => journalNotificationStorageKey("../other"), RangeError);
});

test("stale store mutations merge the latest namespace and distinguish numeric from text IDs", () => {
  const { storage } = memoryStorage();
  const first = createJournalNotificationStore("shared", { storage });
  const second = createJournalNotificationStore("shared", { storage });
  first.read();
  second.read();
  first.upsert(record(4));
  second.upsert(record("4"));
  assert.deepEqual(
    first.read().records.map((entry) => entry.id),
    [4, "4"],
  );
  first.remove(4);
  second.upsert(record("third"));
  assert.deepEqual(
    first.read().records.map((entry) => entry.id),
    ["4", "third"],
  );
});

test("quota failures retain pending data and retry against newer notifications without wiping anything", () => {
  const { storage, values, fail } = memoryStorage();
  const first = createJournalNotificationStore("shared", { storage });
  const second = createJournalNotificationStore("shared", { storage });
  first.upsert(record("existing"));
  const original = values.get(first.key);
  fail("write");
  const failed = first.upsert(record("pending", 2_500));
  assert.equal(failed.status, "error");
  assert.equal(failed.error, "write-failed");
  assert.equal(failed.records.length, 2);
  assert.equal(values.get(first.key), original);
  fail();
  second.upsert(record("newer"));
  assert.equal(first.flush().status, "saved");
  assert.deepEqual(
    second.read().records.map((entry) => entry.id),
    ["existing", "newer", "pending"],
  );
});

test("persisted removal tombstones reject stale checkpoints even with newer write timestamps", () => {
  const { storage, values } = memoryStorage();
  const first = createJournalNotificationStore("shared", { storage });
  const stale = createJournalNotificationStore("shared", { storage });
  first.upsert(record("dismissed"));
  stale.read();
  first.remove("dismissed", 200, 100);
  stale.upsert({ ...record("dismissed", 3_000), updatedAt: 500 });
  assert.deepEqual(first.read().records, []);
  const raw = JSON.parse(values.get(first.key)!);
  assert.deepEqual(raw.tombstones, [{ id: "dismissed", updatedAt: 200 }]);
  // A genuinely new notification may reuse the ID after its removal.
  first.upsert({ ...record("dismissed"), createdAt: 201, updatedAt: 201 });
  assert.equal(first.read().records.length, 1);
  // A delayed exit from the old generation cannot remove the replacement.
  stale.remove("dismissed", 600, 100);
  assert.equal(first.read().records[0].createdAt, 201);
});

test("clear fences old generations even after a stale tab reads the new namespace", () => {
  const { storage, values } = memoryStorage();
  const first = createJournalNotificationStore("shared", { storage });
  const stale = createJournalNotificationStore("shared", { storage });
  first.upsert(record("old"));
  stale.read();
  first.clear(1_000);
  const cleared = values.get(first.key);
  assert.deepEqual(stale.read().records, []);
  assert.equal(
    stale.upsert({ ...record("old"), updatedAt: 1_100 }).error,
    "stale-generation",
  );
  assert.equal(values.get(first.key), cleared);
  // A new store may create new notifications, but old generations stay rejected.
  const fresh = createJournalNotificationStore("shared", { storage });
  assert.deepEqual(fresh.upsert(record("old")).records, []);
  fresh.upsert({ ...record("new"), createdAt: 1_001, updatedAt: 1_001 });
  assert.deepEqual(
    first.read().records.map((entry) => entry.id),
    ["new"],
  );
});

test("same-ID generations permit loading replacements while old descriptor/checkpoint writes cannot rewind them", () => {
  const { storage } = memoryStorage();
  const store = createJournalNotificationStore("shared", { storage });
  const loading = record("saving");
  loading.descriptor.kind = "loading";
  loading.clock = new NotificationClock(Infinity, () => 0).checkpoint();
  store.upsert(loading);
  const success = {
    ...record("saving", 1_500),
    createdAt: 200,
    updatedAt: 300,
  };
  store.upsert(success);
  store.upsert({ ...loading, updatedAt: 900 });
  assert.deepEqual(store.read().records[0], success);
  store.upsert({ ...success, clock: record("saving").clock, updatedAt: 1_000 });
  assert.equal(store.read().records[0].clock.elapsedActive, 1_500);
  store.upsert({
    ...success,
    updatedAt: 250,
    clock: record("saving", 2_000).clock,
  });
  assert.equal(store.read().records[0].clock.elapsedActive, 1_500);
});

test("invalid/cross-journal/versioned saved payloads cannot be overwritten by ordinary mutations", () => {
  const { storage, values } = memoryStorage();
  const key = journalNotificationStorageKey("journal_a");
  const envelope = {
    version: 1,
    scope: "journal_a",
    generation: 0,
    clearedAt: 0,
    tombstones: [],
    notifications: [record("valid")],
  };
  assert.equal(
    parseJournalNotifications(
      JSON.stringify(envelope),
      "journal_a",
      isDescriptor,
    )?.length,
    1,
  );
  for (const raw of [
    "not json",
    JSON.stringify({ ...envelope, version: 2 }),
    JSON.stringify({ ...envelope, scope: "journal_b" }),
    JSON.stringify({ ...envelope, notifications: [{}] }),
    JSON.stringify({ ...envelope, generation: -1 }),
    JSON.stringify({
      ...envelope,
      tombstones: [{ id: "valid", updatedAt: 100 }],
    }),
    JSON.stringify({
      ...envelope,
      notifications: [record("same"), record("same")],
    }),
    JSON.stringify({
      ...envelope,
      notifications: [{ ...record("wrong"), descriptor: { kind: "other" } }],
    }),
    JSON.stringify({
      ...envelope,
      notifications: [
        {
          ...record("wrong-clock"),
          clock: { version: 1, duration: 10, elapsedActive: -1 },
        },
      ],
    }),
  ]) {
    values.set(key, raw);
    const store = createJournalNotificationStore("journal_a", {
      storage,
      validateDescriptor: isDescriptor,
    });
    assert.equal(store.read().error, "invalid-saved-data");
    assert.equal(store.upsert(record("new")).status, "error");
    assert.equal(values.get(key), raw);
    assert.equal(
      parseJournalNotifications(raw, "journal_a", isDescriptor),
      null,
    );
  }
});

test("byte-budget failure never truncates records or overwrites the previous saved payload", () => {
  const { storage, values } = memoryStorage();
  const store = createJournalNotificationStore("large", { storage });
  store.upsert(record("original"));
  const original = values.get(store.key);
  const oversized = record("oversized");
  oversized.descriptor.heading = "🌸".repeat(
    NOTIFICATION_STORAGE_MAX_BYTES / 4,
  );
  assert.equal(store.upsert(oversized).error, "payload-too-large");
  assert.equal(values.get(store.key), original);
  assert.equal(store.read().records.length, 2);
  assert.equal(store.remove("oversized").status, "saved");
  assert.equal(store.read().records.length, 1);
});

test("unavailable SSR storage stays in memory; blocked reads and writes are reported without throwing", () => {
  const local = createJournalNotificationStore("ssr", { storage: null });
  assert.equal(local.upsert(record("memory")).status, "memory");
  assert.equal(local.read().records.length, 1);
  local.remove("memory");
  assert.deepEqual(local.read().records, []);
  const { storage, fail } = memoryStorage();
  const blocked = createJournalNotificationStore("blocked", { storage });
  fail("read");
  assert.equal(blocked.upsert(record("not-lost")).error, "read-failed");
  fail();
  assert.equal(blocked.flush().records[0].id, "not-lost");
});

test("descriptor validation rejects silent JSON loss and consumers cannot mutate saved state", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  for (const invalid of [
    undefined,
    NaN,
    Infinity,
    new Date(),
    { callback: () => {} },
    { hidden: undefined },
    { symbol: Symbol("react") },
    new Array(2),
    cyclic,
  ])
    assert.equal(isNotificationJsonValue(invalid), false);
  const local = createJournalNotificationStore("safe", { storage: null });
  const saved = record("safe");
  const output = local.upsert(saved);
  saved.descriptor.heading = "External mutation";
  output.records[0].descriptor.heading = "Result mutation";
  assert.equal(local.read().records[0].descriptor.heading, "Saved safe");
  const unsafe = {
    ...saved,
    descriptor: { onUndo: () => {} },
  };
  assert.equal(local.upsert(unsafe as never).error, "invalid-record");
  assert.equal(
    local.upsert({ ...record("callback"), onUndo: () => {} } as never).error,
    "invalid-record",
  );
  assert.equal(local.read().records.length, 1);
});
