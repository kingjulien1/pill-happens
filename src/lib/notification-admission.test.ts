import assert from "node:assert/strict";
import test from "node:test";
import {
  NOTIFICATION_MAX_ACTIVE,
  NOTIFICATION_STACK_GAP,
  notificationAdmissions,
  notificationIsFullyVisible,
  publishNotificationQueue,
  getNotificationQueueSnapshot,
  subscribeNotificationQueue,
  retireNotificationHost,
  releaseNotificationHost,
  retiringNotificationCount,
  subscribeNotificationSlotRelease,
} from "./notification-admission";
import { NotificationClock } from "./journal-notification-lifecycle";

const candidates = (n: number, active = 0) =>
  Array.from({ length: n }, (_, id) => ({
    id,
    admitted: id < active,
    removed: false,
  }));

test("only twenty slots are admitted and the untouched remainder stays in FIFO order", () => {
  const entries = candidates(65);
  const first = notificationAdmissions(entries);
  assert.equal(NOTIFICATION_MAX_ACTIVE, 20);
  assert.equal(NOTIFICATION_STACK_GAP, 10);
  assert.deepEqual(
    first,
    Array.from({ length: 20 }, (_, id) => id),
  );
  first.forEach((id) => {
    entries[Number(id)].admitted = true;
  });
  assert.deepEqual(notificationAdmissions(entries), []);
  entries.splice(0, 2);
  assert.deepEqual(notificationAdmissions(entries), [20, 21]);
  assert.equal(entries.length, 63, "nothing else was evicted to make space");
});
test("exiting slots stay reserved through native unmount and queued cancellations leave no holes", () => {
  const entries = candidates(25, 18);
  entries[19].removed = true;
  assert.deepEqual(notificationAdmissions(entries, 2), []);
  assert.deepEqual(notificationAdmissions(entries, 1), [18]);
  assert.deepEqual(notificationAdmissions(entries, 0), [18, 20]);
  assert.deepEqual(notificationAdmissions(candidates(40, 21)), []);
});
test("same-ID replacements retain their slot and queued position", () => {
  const entries = new Map(candidates(24, 20).map((entry) => [entry.id, entry]));
  entries.set(5, { id: 5, admitted: true, removed: false });
  entries.set(20, { id: 20, admitted: false, removed: false });
  entries.delete(0);
  assert.deepEqual(notificationAdmissions([...entries.values()]), [20]);
});
test("queue counts publish only changed snapshots and listeners can be released", () => {
  publishNotificationQueue(0, 0);
  let calls = 0;
  const unsubscribe = subscribeNotificationQueue(() => calls++);
  publishNotificationQueue(20, 7);
  const state = getNotificationQueueSnapshot();
  publishNotificationQueue(20, 7);
  assert.equal(calls, 1);
  assert.equal(getNotificationQueueSnapshot(), state);
  unsubscribe();
  publishNotificationQueue(19, 7);
  assert.equal(calls, 1);
  publishNotificationQueue(0, 0);
});
test("retirement reserves a slot exactly once and only a real release wakes admission", () => {
  const initial = retiringNotificationCount();
  let calls = 0;
  const unsub = subscribeNotificationSlotRelease(() => calls++);
  retireNotificationHost("synthetic-slot");
  retireNotificationHost("synthetic-slot");
  assert.equal(retiringNotificationCount(), initial + 1);
  assert.equal(calls, 0);
  releaseNotificationHost("synthetic-slot");
  releaseNotificationHost("synthetic-slot");
  assert.equal(retiringNotificationCount(), initial);
  assert.equal(calls, 1);
  unsub();
});
test("partially clipped cards are not considered fully visible", () => {
  assert.equal(notificationIsFullyVisible(true, 1), true);
  for (const value of [0, 0.5, 0.999, NaN, Infinity])
    assert.equal(notificationIsFullyVisible(true, value), false);
  assert.equal(notificationIsFullyVisible(false, 1), false);
});
test("queued and offscreen time is free, including restored countdowns and overlapping holds", () => {
  let now = 0;
  const clock = new NotificationClock(1000, () => now);
  clock.pause("not-visible", true);
  clock.pause("queued", true);
  now = 60000;
  clock.pause("queued", false);
  now += 60000;
  assert.equal(clock.checkpoint().elapsedActive, 0);
  clock.pause("not-visible", false);
  now += 200;
  assert.equal(clock.checkpoint().elapsedActive, 200);
  clock.pause("not-visible", true);
  clock.pause("hover", true);
  now += 60000;
  clock.pause("not-visible", false);
  now += 60000;
  assert.equal(clock.checkpoint().elapsedActive, 200);
  clock.pause("hover", false);
  now += 100;
  const checkpoint = clock.checkpoint();
  assert.equal(checkpoint.elapsedActive, 300);
  const restored = NotificationClock.restore(checkpoint, () => now);
  restored.pause("not-visible", true);
  now += 60000;
  assert.equal(restored.checkpoint().elapsedActive, 300);
});

test("a burst's last intersection entry wins, including a fully-visible-to-hidden batch", async () => {
  const { notificationVisibilityAfterBatch } =
    await import("./notification-admission");
  const before = { fullyVisible: false, headerVisible: false };
  const entry = (target: string, ratio: number) => ({
    target,
    isIntersecting: ratio > 0,
    intersectionRatio: ratio,
  });
  assert.deepEqual(
    notificationVisibilityAfterBatch(
      before,
      [
        entry("card", 1),
        entry("header", 1),
        entry("card", 0.6),
        entry("header", 0),
        entry("card", 0),
      ],
      "card",
      "header",
    ),
    before,
  );
  assert.deepEqual(
    notificationVisibilityAfterBatch(
      before,
      [entry("card", 0), entry("card", 1), entry("header", 1)],
      "card",
      "header",
    ),
    { fullyVisible: true, headerVisible: true },
  );
  assert.deepEqual(
    notificationVisibilityAfterBatch(before, [entry("card", 1)], "card"),
    { fullyVisible: true, headerVisible: true },
  );
});
test("zero-area intersections cannot start a reading clock", async () => {
  const { notificationVisibilityAfterBatch } =
    await import("./notification-admission");
  const state = notificationVisibilityAfterBatch(
    { fullyVisible: false, headerVisible: false },
    [
      {
        target: "card",
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { width: 300, height: 0 },
      },
    ],
    "card",
  );
  assert.deepEqual(state, { fullyVisible: false, headerVisible: false });
});
