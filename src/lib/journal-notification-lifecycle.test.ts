import test from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFICATION_COMPLETION_GRACE,
  NOTIFICATION_DEFAULT_DURATION,
  NotificationClock,
  NotificationExitRegistry,
  settleNotificationUndo,
} from "./journal-notification-lifecycle";

function close(actual: number, expected: number, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
}

/** Integral of 1 / speed, independently expressed in terms of bar progress. */
function timeAtProgress(duration: number, progress: number) {
  if (progress >= 0.3) return duration * (1 - progress);
  const middle = Math.log(1 / (0.25 + 2.5 * Math.max(0.1, progress))) / 2.5;
  return duration * (0.7 + middle + Math.max(0, 0.1 - progress) / 0.5);
}

test("default nominal budget is one third of 22 seconds, with a progressive finish and grace", () => {
  let now = 0;
  const clock = new NotificationClock(NOTIFICATION_DEFAULT_DURATION, () => now);
  assert.equal(NOTIFICATION_DEFAULT_DURATION, 22_000 / 3);
  const completeAt = timeAtProgress(NOTIFICATION_DEFAULT_DURATION, 0);
  close(clock.snapshot().timeUntilComplete, completeAt);
  now = NOTIFICATION_DEFAULT_DURATION / 2;
  close(clock.snapshot().progress, 0.5);
  clock.pause("pointer", true);
  now += 8_000;
  close(clock.snapshot().remaining, NOTIFICATION_DEFAULT_DURATION / 2);
  clock.pause("pointer", false);
  now += completeAt - NOTIFICATION_DEFAULT_DURATION / 2;
  assert.equal(clock.snapshot().complete, true);
  assert.equal(clock.snapshot().expired, false);
  close(clock.snapshot().graceRemaining, NOTIFICATION_COMPLETION_GRACE);
  now += NOTIFICATION_COMPLETION_GRACE;
  assert.equal(clock.snapshot().expired, true);
});

test("exact breakpoints retain full speed above 30% and half speed below 10%", () => {
  let now = 0;
  const duration = 10_000;
  const clock = new NotificationClock(duration, () => now);
  for (const [progress, speed] of [
    [1, 1],
    [0.6, 1],
    [0.3, 1],
    [0.2, 0.75],
    [0.1, 0.5],
    [0.05, 0.5],
  ]) {
    now = timeAtProgress(duration, progress);
    const state = clock.snapshot();
    close(state.progress, progress);
    close(state.remaining, progress * duration);
    close(state.speed, speed);
    close(state.timeUntilComplete, timeAtProgress(duration, 0) - now);
  }
  now = timeAtProgress(duration, 0);
  assert.equal(clock.snapshot().progress, 0);
  assert.equal(clock.snapshot().speed, 0);
});

test("speed is continuous at both slowdown boundaries and slows monotonically between them", () => {
  const duration = 1_000;
  const speeds: number[] = [];
  for (const progress of [
    0.300001, 0.3, 0.299999, 0.25, 0.2, 0.15, 0.100001, 0.1, 0.099999,
  ]) {
    let now = 0;
    const clock = new NotificationClock(duration, () => now);
    now = timeAtProgress(duration, progress);
    speeds.push(clock.snapshot().speed);
  }
  assert.ok(
    speeds.every((speed, index) => index === 0 || speed <= speeds[index - 1]),
  );
  close(speeds[0], speeds[2], 0.00001);
  close(speeds[6], speeds[8], 0.00001);
});

test("the final 10% takes twice its nominal time and the last-three-second value is actual active time", () => {
  let now = 0;
  const duration = 10_000;
  const clock = new NotificationClock(duration, () => now);
  now = timeAtProgress(duration, 0.1);
  close(clock.snapshot().remaining, 1_000);
  close(clock.snapshot().timeUntilComplete, 2_000);
  now += 1_000;
  close(clock.snapshot().remaining, 500);
  close(clock.snapshot().progress, 0.05);
  close(clock.snapshot().timeUntilComplete, 1_000);
  now += 1_000;
  assert.equal(clock.snapshot().complete, true);
  assert.equal(clock.snapshot().expired, false);
});

test("color and card urgency have independent bounded thresholds", () => {
  const duration = 10_000;
  for (const [progress, color, card] of [
    [1, 0, 0],
    [0.4, 0, 0],
    [0.3, 1 / 3, 0],
    [0.25, 0.5, 0.25],
    [0.2, 2 / 3, 0.5],
    [0.1, 1, 1],
    [0, 1, 1],
  ]) {
    let now = 0;
    const clock = new NotificationClock(duration, () => now);
    now = timeAtProgress(duration, progress);
    close(clock.snapshot().colorUrgency, color);
    close(clock.snapshot().cardUrgency, card);
  }
});

test("large elapsed jumps and arbitrarily partitioned ticks produce the same snapshot", () => {
  const duration = 7_333.333333;
  for (const target of [0, 2_000, 5_500, 6_500, 7_700, 8_500, 8_800, 20_000]) {
    let bigNow = 0;
    let smallNow = 0;
    const big = new NotificationClock(duration, () => bigNow);
    const small = new NotificationClock(duration, () => smallNow);
    bigNow = target;
    const expected = big.snapshot();
    for (let index = 1; index <= 113; index++) {
      smallNow = (target * index) / 113;
      small.snapshot();
    }
    const actual = small.snapshot();
    for (const key of [
      "remaining",
      "progress",
      "timeUntilComplete",
      "graceRemaining",
      "speed",
      "colorUrgency",
      "cardUrgency",
    ] as const)
      close(actual[key], expected[key]);
    assert.equal(actual.complete, expected.complete);
    assert.equal(actual.expired, expected.expired);
  }
});

test("partitioned pauses retain exact active time through both slowdown segments", () => {
  let now = 0;
  const duration = 10_000;
  const clock = new NotificationClock(duration, () => now);
  now = 7_000;
  clock.pause("expanded", true);
  now += 2_000;
  clock.pause("hidden", true);
  now += 3_000;
  clock.pause("expanded", false);
  now += 4_000;
  close(clock.snapshot().progress, 0.3);
  clock.pause("hidden", false);
  now += timeAtProgress(duration, 0.2) - 7_000;
  close(clock.snapshot().progress, 0.2);
  assert.equal(clock.snapshot().paused, false);
});

test("independent clocks advance together without front-card coordination", () => {
  let now = 0;
  const first = new NotificationClock(10_000, () => now);
  const second = new NotificationClock(10_000, () => now);
  now = 2_000;
  second.pause("pointer", true);
  now = 5_000;
  close(first.snapshot().progress, 0.5);
  close(second.snapshot().progress, 0.8);
  second.pause("pointer", false);
  now = 7_000;
  close(first.snapshot().progress, 0.3);
  close(second.snapshot().progress, 0.6);
});

test("overlapping holds, expansion and hidden pauses also freeze the completed grace period", () => {
  let now = 0;
  const clock = new NotificationClock(1_000, () => now);
  now = clock.snapshot().timeUntilComplete;
  assert.equal(clock.snapshot().complete, true);
  now += 100;
  clock.pause("pointer", true);
  now += 1_000;
  clock.pause("expanded", true);
  now += 1_000;
  clock.pause("hidden", true);
  clock.pause("pointer", false);
  clock.pause("expanded", false);
  now += 20_000;
  assert.equal(clock.snapshot().expired, false);
  close(clock.snapshot().graceRemaining, 400);
  clock.pause("hidden", false);
  now += 399;
  assert.equal(clock.snapshot().expired, false);
  now += 1;
  assert.equal(clock.snapshot().expired, true);
  close(clock.snapshot().graceRemaining, 0);
});

test("a single elapsed jump consumes bar time and grace without an extra frame", () => {
  let now = 0;
  const clock = new NotificationClock(100, () => now);
  now =
    clock.snapshot().timeUntilComplete + NOTIFICATION_COMPLETION_GRACE + 10_000;
  const state = clock.snapshot();
  assert.equal(state.progress, 0);
  assert.equal(state.timeUntilComplete, 0);
  assert.equal(state.graceRemaining, 0);
  assert.equal(state.complete, true);
  assert.equal(state.expired, true);
});

test("loading notifications remain indefinite, nonurgent and never enter grace", () => {
  let now = 100;
  const clock = new NotificationClock(Infinity, () => now);
  now = 1_000_000;
  assert.deepEqual(clock.snapshot(), {
    remaining: Infinity,
    progress: 1,
    paused: false,
    expired: false,
    complete: false,
    timeUntilComplete: Infinity,
    graceRemaining: 0,
    speed: 0,
    colorUrgency: 0,
    cardUrgency: 0,
  });
  clock.pause("hidden", true);
  now += 1_000_000;
  clock.pause("hidden", false);
  assert.equal(clock.snapshot().expired, false);
});

test("the monotonic guard ignores backwards time without charging it twice", () => {
  let now = 1_000;
  const clock = new NotificationClock(1_000, () => now);
  now = 1_500;
  close(clock.snapshot().progress, 0.5);
  now = 1_200;
  close(clock.snapshot().progress, 0.5);
  clock.pause("pointer", true);
  clock.pause("pointer", false);
  now = 1_600;
  close(clock.snapshot().progress, 0.4);
});

test("zero and negative finite budgets complete immediately but retain the active grace", () => {
  for (const duration of [0, -1]) {
    let now = 0;
    const clock = new NotificationClock(duration, () => now);
    assert.equal(clock.snapshot().complete, true);
    assert.equal(clock.snapshot().expired, false);
    assert.equal(clock.snapshot().progress, 0);
    now = NOTIFICATION_COMPLETION_GRACE;
    assert.equal(clock.snapshot().expired, true);
  }
});

test("explicit dismissal bypasses a paused countdown and its unconsumed grace", () => {
  const clock = new NotificationClock(1_000, () => 0);
  clock.pause("expanded", true);
  const registry = new NotificationExitRegistry();
  const version = registry.begin("a");
  const exits: string[] = [];
  registry.attach(
    "a",
    version,
    (reason) => exits.push(reason),
    () => {},
  );
  registry.request("a", "action");
  assert.deepEqual(exits, ["action"]);
  assert.equal(clock.snapshot().expired, false);
  assert.equal(registry.finish("a", version), true);
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
