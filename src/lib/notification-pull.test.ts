import test from "node:test";
import assert from "node:assert/strict";
import { brandPullOffset, getBrandPullThresholds } from "./brand-refresh";
import {
  NOTIFICATION_PULL_THRESHOLD,
  NOTIFICATION_PULL_MAX_OFFSET,
  notificationPullThreshold,
  notificationPullOffset,
  updateNotificationPull,
  type NotificationPullState,
} from "./notification-pull";

const idle = (): NotificationPullState => ({
  intent: "pending",
  distance: 0,
  progress: 0,
  ready: false,
});
const move = (state: NotificationPullState, x: number, y: number) =>
  updateNotificationPull(state, x, y, NOTIFICATION_PULL_THRESHOLD);

test("notification pulls double the former captured threshold, including short viewports", () => {
  assert.equal(NOTIFICATION_PULL_THRESHOLD, (340 / 3) * 2);
  for (const bottom of [900, 320, 180]) {
    const expected =
      (getBrandPullThresholds(60, 70, 390, bottom).refresh / 3) * 2;
    assert.equal(notificationPullThreshold(60, 70, 390, bottom), expected);
  }
});

test("a tap and small jitter show no ready action", () => {
  for (const [x, y] of [
    [0, 0],
    [2, 3],
    [0, 8],
  ]) {
    const state = move(idle(), x, y);
    assert.equal(state.intent, "pending");
    assert.equal(state.ready, false);
  }
});

test("a downward pull claims only after slop and opens at its own threshold", () => {
  const state = move(idle(), 1, NOTIFICATION_PULL_THRESHOLD - 1);
  assert.equal(state.intent, "pull");
  assert.equal(state.ready, false);
  assert.equal(move(state, 2, NOTIFICATION_PULL_THRESHOLD).ready, true);
});

test("the former full pull reaches only half progress; fill follows travel linearly", () => {
  for (const progress of [0.25, 0.5, 0.75, 1]) {
    const state = move(idle(), 0, NOTIFICATION_PULL_THRESHOLD * progress);
    assert.equal(state.progress, progress);
    assert.equal(state.ready, progress === 1);
  }
  assert.equal(move(idle(), 0, NOTIFICATION_PULL_THRESHOLD * 2).progress, 1);
});

test("horizontal and upward swipes stay native even if the pointer later changes direction", () => {
  for (const [x, y] of [
    [20, 2],
    [-20, 2],
    [0, -20],
  ]) {
    const state = move(idle(), x, y);
    assert.equal(state.intent, "native");
    assert.equal(move(state, 0, 200).intent, "native");
    assert.equal(move(state, 0, 200).ready, false);
  }
});

test("a neutral diagonal can become a downward pull", () => {
  const diagonal = move(idle(), 15, 15);
  assert.equal(diagonal.intent, "pending");
  assert.equal(move(diagonal, 15, 30).intent, "pull");
});

test("retracting a ready pull cancels release without changing its ownership", () => {
  const ready = move(idle(), 0, NOTIFICATION_PULL_THRESHOLD + 10);
  const retracted = move(ready, 30, 30);
  assert.equal(ready.ready, true);
  assert.equal(retracted.intent, "pull");
  assert.equal(retracted.ready, false);
  assert.equal(move(retracted, 0, NOTIFICATION_PULL_THRESHOLD).ready, true);
  assert.equal(move(ready, 0, -10).distance, 0);
});

test("the final release sample can reach readiness without an intermediate move", () => {
  assert.equal(move(idle(), 0, NOTIFICATION_PULL_THRESHOLD).ready, true);
});

test("invalid samples clear readiness and invalid thresholds retain a deliberate default", () => {
  const ready = move(idle(), 0, NOTIFICATION_PULL_THRESHOLD + 10);
  assert.equal(move(ready, NaN, 130).ready, false);
  assert.equal(move(ready, 0, Infinity).ready, false);
  assert.equal(updateNotificationPull(idle(), 0, 10, 0).ready, false);
});

test("resistance follows the longer pull while visual travel stays bounded at 56px", () => {
  for (const distance of [0, 10, 60, 120, 1000])
    assert.equal(
      notificationPullOffset(distance),
      (brandPullOffset((distance * 3) / 2) / 3) * 2,
    );
  assert.equal(NOTIFICATION_PULL_MAX_OFFSET, 56);
  assert.ok(notificationPullOffset(1000) <= NOTIFICATION_PULL_MAX_OFFSET);
  assert.equal(notificationPullOffset(-20), 0);
  assert.equal(notificationPullOffset(NaN), 0);
});
