import test from "node:test";
import assert from "node:assert/strict";
import { brandPullOffset, getBrandPullThresholds } from "./brand-refresh";
import {
  NOTIFICATION_PULL_THRESHOLD,
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

test("notification pulls use exactly one-third of the captured branding distance", () => {
  assert.equal(NOTIFICATION_PULL_THRESHOLD, 340 / 3);
  for (const bottom of [900, 320, 180]) {
    const expected = getBrandPullThresholds(60, 70, 390, bottom).refresh / 3;
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
  const ready = move(idle(), 0, 130);
  const retracted = move(ready, 30, 30);
  assert.equal(ready.ready, true);
  assert.equal(retracted.intent, "pull");
  assert.equal(retracted.ready, false);
  assert.equal(move(retracted, 0, 120).ready, true);
  assert.equal(move(ready, 0, -10).distance, 0);
});

test("the final release sample can reach readiness without an intermediate move", () => {
  assert.equal(move(idle(), 0, 120).ready, true);
});

test("invalid samples clear readiness and invalid thresholds retain a deliberate default", () => {
  const ready = move(idle(), 0, 130);
  assert.equal(move(ready, NaN, 130).ready, false);
  assert.equal(move(ready, 0, Infinity).ready, false);
  assert.equal(updateNotificationPull(idle(), 0, 10, 0).ready, false);
});

test("resistance matches the branding curve with a bounded 28px visual travel", () => {
  for (const distance of [0, 10, 60, 120, 1000])
    assert.equal(
      notificationPullOffset(distance),
      brandPullOffset(distance * 3) / 3,
    );
  assert.ok(notificationPullOffset(1000) <= 28);
  assert.equal(notificationPullOffset(-20), 0);
  assert.equal(notificationPullOffset(NaN), 0);
});
