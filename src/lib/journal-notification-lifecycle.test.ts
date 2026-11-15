import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFICATION_DEFAULT_DURATION,
  NotificationClock,
  NotificationExitRegistry,
  settleNotificationUndo,
} from "./journal-notification-lifecycle";

test("default notifications use 22 seconds of active reading, excluding a held pause", () => {
  let now = 0;
  const clock = new NotificationClock(NOTIFICATION_DEFAULT_DURATION, () => now);
  now = 11_000;
  assert.equal(clock.snapshot().progress, 0.5);
  clock.pause("pointer", true);
  now += 8_000;
  assert.equal(clock.snapshot().remaining, 11_000);
  clock.pause("pointer", false);
  now += 11_000;
  assert.equal(clock.snapshot().expired, true);
});

test("reading clock retains elapsed time across overlapping pause reasons", () => {
  let now = 0;
  const clock = new NotificationClock(5_500, () => now);
  now = 1_000;
  assert.equal(clock.snapshot().remaining, 4_500);
  clock.pause("expanded", true);
  now = 2_000;
  clock.pause("hidden", true);
  now = 3_000;
  clock.pause("expanded", false);
  now = 4_000;
  assert.equal(clock.snapshot().remaining, 4_500);
  clock.pause("hidden", false);
  now = 5_000;
  assert.equal(clock.snapshot().remaining, 3_500);
  assert.equal(clock.snapshot().paused, false);
});

test("rear, pointer and focus pauses do not restart or overrun the countdown", () => {
  let now = 0;
  const clock = new NotificationClock(100, () => now);
  clock.pause("rear", true);
  now = 10_000;
  clock.pause("focus", true);
  clock.pause("pointer", true);
  clock.pause("rear", false);
  clock.pause("focus", false);
  assert.equal(clock.snapshot().progress, 1);
  clock.pause("pointer", false);
  now += 60;
  assert.equal(clock.snapshot().remaining, 40);
  now += 60;
  assert.deepEqual(clock.snapshot(), {
    remaining: 0,
    progress: 0,
    paused: false,
    expired: true,
  });
});

test("loading notifications remain indefinite and clock ignores backwards time", () => {
  let now = 100;
  const clock = new NotificationClock(Infinity, () => now);
  now = 1_000_000;
  assert.equal(clock.snapshot().remaining, Infinity);
  assert.equal(clock.snapshot().expired, false);
  const finite = new NotificationClock(100, () => now);
  now -= 100;
  assert.equal(finite.snapshot().remaining, 100);
  now += 150;
  assert.equal(finite.snapshot().remaining, 50);
});

test("dismiss-before-mount attaches once and retains its original reason", () => {
  const registry = new NotificationExitRegistry();
  const version = registry.begin("saving");
  assert.equal(registry.request("saving", "timeout"), true);
  const reasons: string[] = [];
  registry.attach(
    "saving",
    version,
    (reason) => reasons.push(reason),
    () => {},
  );
  registry.request("saving", "dismiss");
  assert.deepEqual(reasons, ["timeout"]);
  assert.equal(registry.finish("saving", version), true);
  assert.equal(registry.request("saving"), false);
});

test("loading-to-success update cancels pending exit and rejects stale timers", () => {
  const registry = new NotificationExitRegistry();
  let cancelled = 0;
  const loading = registry.begin(9);
  registry.attach(
    9,
    loading,
    () => {},
    () => cancelled++,
  );
  registry.request(9);
  const success = registry.begin(9);
  assert.equal(cancelled, 1);
  assert.equal(registry.finish(9, loading), false);
  assert.equal(registry.isCurrent(9, success), true);
  assert.deepEqual(registry.ids(), [9]);
  assert.equal(registry.finish(9, success), true);
  assert.equal(registry.finish(9, success), false);
});

test("stale effect cleanup cannot detach the updated toast or dismiss another ID", () => {
  const registry = new NotificationExitRegistry();
  const first = registry.begin("a");
  const detach = registry.attach(
    "a",
    first,
    () => {},
    () => {},
  );
  const second = registry.begin("a");
  let requests = 0;
  registry.attach(
    "a",
    second,
    () => requests++,
    () => {},
  );
  registry.begin("b");
  detach();
  registry.request("a");
  assert.equal(requests, 1);
  assert.deepEqual(registry.ids(), ["a", "b"]);
  assert.equal(registry.finish("a", first), false);
  assert.equal(registry.isCurrent("b", second), false);
});

for (const reason of ["dismissed", "superseded"] as const) {
  test(`pending undo reports a late failure exactly once after its card is ${reason}`, async () => {
    const registry = new NotificationExitRegistry();
    const version = registry.begin("undo");
    let reject!: (error: Error) => void;
    const pending = new Promise<void>((_, fail) => {
      reject = fail;
    });
    let attempts = 0;
    let inline = 0;
    let success = 0;
    const detached: unknown[] = [];
    const result = settleNotificationUndo({
      undo: () => {
        attempts++;
        return pending;
      },
      isCurrent: () => registry.isCurrent("undo", version),
      onFailure: () => inline++,
      onSuccess: () => success++,
      onDetachedFailure: (error) => detached.push(error),
    });
    if (reason === "dismissed") registry.finish("undo", version);
    else registry.begin("undo");
    const error = new Error("The journal changed before undo finished.");
    reject(error);
    await result;
    assert.deepEqual(detached, [error]);
    assert.equal(attempts, 1);
    assert.equal(inline, 0);
    assert.equal(success, 0);
  });
}

test("live undo failure remains inline, and a detached success never repeats the operation", async () => {
  const error = new Error("Please retry.");
  const inline: unknown[] = [];
  let detached = 0;
  await settleNotificationUndo({
    undo: () => {
      throw error;
    },
    isCurrent: () => true,
    onSuccess: () => assert.fail("failed undo must not succeed"),
    onFailure: (failure) => inline.push(failure),
    onDetachedFailure: () => detached++,
  });
  let attempts = 0;
  await settleNotificationUndo({
    undo: async () => {
      attempts++;
    },
    isCurrent: () => false,
    onSuccess: () =>
      assert.fail("detached success must not change the replacement card"),
    onFailure: () => assert.fail("successful operation must not fail"),
    onDetachedFailure: () => detached++,
  });
  assert.deepEqual(inline, [error]);
  assert.equal(detached, 0);
  assert.equal(attempts, 1);
});
