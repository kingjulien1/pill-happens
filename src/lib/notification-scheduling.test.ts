import assert from "node:assert/strict";
import test from "node:test";
import { NotificationClock } from "./journal-notification-lifecycle";
import { nextNotificationWake } from "./notification-scheduling";

test("indefinite, paused and expired notices require no polling", () => {
  let now = 0;
  const clock = new NotificationClock(1_000, () => now);
  assert.equal(
    nextNotificationWake(new NotificationClock(Infinity).snapshot(), true),
    null,
  );
  clock.pause("reading", true);
  assert.equal(nextNotificationWake(clock.snapshot(), true), null);
  clock.pause("reading", false);
  now = 10_000;
  assert.equal(nextNotificationWake(clock.snapshot(), true), null);
});

test("visible progress uses five samples per second while rear cards sleep until expiry", () => {
  const snapshot = new NotificationClock(10_000).snapshot();
  assert.equal(nextNotificationWake(snapshot, true), 200);
  assert.equal(
    nextNotificationWake(snapshot, false),
    snapshot.timeUntilComplete + snapshot.graceRemaining,
  );
});

test("countdown boundaries and the final grace deadline take precedence over sample cadence", () => {
  const snapshot = new NotificationClock(10_000).snapshot();
  assert.equal(
    nextNotificationWake({ ...snapshot, timeUntilComplete: 3_020 }, true),
    20,
  );
  assert.equal(
    nextNotificationWake({ ...snapshot, timeUntilComplete: 2_004 }, true),
    4,
  );
  assert.equal(
    nextNotificationWake({ ...snapshot, timeUntilComplete: 8 }, true),
    8,
  );
  assert.equal(
    nextNotificationWake(
      { ...snapshot, complete: true, graceRemaining: 850 },
      true,
    ),
    850,
  );
});

test("one rear-card wake consumes its exact remaining lifetime including grace", () => {
  let now = 0;
  const clock = new NotificationClock(10_000, () => now);
  const delay = nextNotificationWake(clock.snapshot(), false);
  assert.notEqual(delay, null);
  now += delay!;
  assert.equal(clock.snapshot().expired, true);
  assert.equal(nextNotificationWake(clock.snapshot(), false), null);
});

test("long finite lifetimes cannot overflow the browser timeout into a busy loop", () => {
  assert.equal(
    nextNotificationWake(
      new NotificationClock(10_000_000_000).snapshot(),
      false,
    ),
    2_147_483_647,
  );
});

test("sampling less often preserves expiry and stays below a quarter of the former polling work", () => {
  let now = 0;
  let wakes = 0;
  const clock = new NotificationClock(10_000, () => now);
  while (true) {
    const delay = nextNotificationWake(clock.snapshot(), true);
    if (delay === null) break;
    now += delay;
    wakes++;
    assert.ok(wakes < 100);
  }
  assert.equal(clock.snapshot().expired, true);
  assert.ok(wakes <= Math.ceil(now / 50) / 4 + 4);
});
