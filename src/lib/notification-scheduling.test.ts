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

test("visible progress uses five samples per second while clipped cards have no wake timer", () => {
  const snapshot = new NotificationClock(10_000).snapshot();
  assert.equal(nextNotificationWake(snapshot, true), 200);
  assert.equal(nextNotificationWake(snapshot, false), null);
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

test("offscreen finite notices have no timeout, including very long lifetimes", () => {
  assert.equal(
    nextNotificationWake(new NotificationClock(10000).snapshot(), false),
    null,
  );
  assert.equal(
    nextNotificationWake(new NotificationClock(10000000000).snapshot(), false),
    null,
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
