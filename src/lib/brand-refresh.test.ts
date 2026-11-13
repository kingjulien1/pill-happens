import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_REFRESH_MARKER_TTL,
  BRAND_REFRESH_SLOP,
  BRAND_REFRESH_THRESHOLD,
  BRAND_PULL_EXCHANGE_END,
  BRAND_PULL_EXCHANGE_DISTANCE,
  getBrandPullThresholds,
  getBrandPullThreshold,
  brandPullOffset,
  updateBrandPull,
  advanceBrandPullMotion,
  advanceBrandPullExchange,
  advanceBrandPullSpring,
  getBrandPullFeedback,
  getBrandPullRelease,
  type BrandPullState,
  type BrandPullPose,
  type BrandPullSpring,
  getBrandPullAction,
  isBrandRefreshPull,
  isBrandMedicationsPull,
  isRecentBrandRefresh,
} from "./brand-refresh";

test("a refresh requires reaching the downward threshold", () => {
  for (const distance of [-200, -1, 0, 8, BRAND_REFRESH_THRESHOLD - 0.01]) {
    assert.equal(isBrandRefreshPull(0, distance), false);
  }
  assert.equal(isBrandRefreshPull(0, BRAND_REFRESH_THRESHOLD), true);
  assert.equal(isBrandRefreshPull(0, BRAND_REFRESH_THRESHOLD + 40), true);
});

test("horizontal and diagonal gestures cannot arm a refresh", () => {
  const along = BRAND_REFRESH_THRESHOLD + 24;
  const boundary = along / 1.5;
  for (const direction of [-1, 1]) {
    assert.equal(isBrandRefreshPull(direction * along, 0), false);
    assert.equal(isBrandRefreshPull(direction * boundary, along), false);
    assert.equal(isBrandRefreshPull(direction * (boundary + 1), along), false);
    assert.equal(isBrandRefreshPull(direction * (boundary - 1), along), true);
  }
});

test("direction classification precedes release thresholds and tolerates small cross-axis jitter", () => {
  assert.equal(getBrandPullAction(0, 0), null);
  assert.equal(getBrandPullAction(0, BRAND_REFRESH_SLOP / 2), "refresh");
  assert.equal(getBrandPullAction(BRAND_REFRESH_SLOP / 2, 0), "medications");
  for (const jitter of [-3, 0, 3]) {
    assert.equal(getBrandPullAction(jitter, 10), "refresh");
    assert.equal(getBrandPullAction(10, jitter), "medications");
  }
  assert.equal(isBrandRefreshPull(3, 10), false);
  assert.equal(isBrandMedicationsPull(10, 3), false);
});

test("Medications requires the same release distance in the positive horizontal direction", () => {
  for (const distance of [-200, -1, 0, 8, BRAND_REFRESH_THRESHOLD - 0.01])
    assert.equal(isBrandMedicationsPull(distance, 0), false);
  assert.equal(isBrandMedicationsPull(BRAND_REFRESH_THRESHOLD, 0), true);
  assert.equal(isBrandMedicationsPull(BRAND_REFRESH_THRESHOLD + 40, 0), true);
  for (const jitter of [-3, 3]) {
    assert.equal(isBrandMedicationsPull(BRAND_REFRESH_THRESHOLD, jitter), true);
    assert.equal(isBrandRefreshPull(jitter, BRAND_REFRESH_THRESHOLD), true);
  }
});

test("strict axis dominance rejects diagonal boundaries without ambiguous dual actions", () => {
  for (const cross of [-80, 80]) {
    assert.equal(getBrandPullAction(120, cross), null);
    assert.equal(getBrandPullAction(cross, 120), null);
    assert.equal(isBrandMedicationsPull(120, cross), false);
    assert.equal(isBrandRefreshPull(cross, 120), false);
  }
  assert.equal(getBrandPullAction(120, 79), "medications");
  assert.equal(getBrandPullAction(79, 120), "refresh");
  for (const [x, y] of [
    [120, 81],
    [81, 120],
    [120, 120],
    [-120, -120],
  ]) {
    assert.equal(getBrandPullAction(x, y), null);
    assert.equal(isBrandRefreshPull(x, y), false);
    assert.equal(isBrandMedicationsPull(x, y), false);
  }
  const beyond = BRAND_REFRESH_THRESHOLD + 64;
  for (const [x, y] of [
    [0, beyond],
    [beyond, 0],
    [-20, beyond],
    [beyond, -20],
  ])
    assert.notEqual(isBrandRefreshPull(x, y), isBrandMedicationsPull(x, y));
});

test("leftward and upward pulls cannot select either supported action", () => {
  for (const [x, y] of [
    [-160, 0],
    [0, -160],
    [-160, 20],
    [20, -160],
  ]) {
    assert.equal(getBrandPullAction(x, y), null);
    assert.equal(isBrandRefreshPull(x, y), false);
    assert.equal(isBrandMedicationsPull(x, y), false);
  }
});

test("non-finite pointer coordinates cannot classify or arm a gesture", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (const [x, y] of [
      [invalid, 0],
      [0, invalid],
      [invalid, 160],
      [160, invalid],
    ]) {
      assert.equal(getBrandPullAction(x, y), null);
      assert.equal(isBrandRefreshPull(x, y), false);
      assert.equal(isBrandMedicationsPull(x, y), false);
    }
  }
});

test("pull resistance grows continuously without moving the handle out of its header gap", () => {
  assert.equal(brandPullOffset(-100), 0);
  assert.equal(brandPullOffset(0), 0);
  let previous = 0;
  for (const distance of [1, 8, 30, 144, BRAND_REFRESH_THRESHOLD, 400, 1_000]) {
    const offset = brandPullOffset(distance);
    assert.ok(offset > previous);
    assert.ok(offset < distance);
    assert.ok(offset < 84);
    previous = offset;
  }
  assert.ok(
    brandPullOffset(BRAND_REFRESH_THRESHOLD + 0.01) -
      brandPullOffset(BRAND_REFRESH_THRESHOLD) <
      0.01,
    "crossing the release threshold must not jump the handle",
  );
});

test("reload hand-off accepts only a recent marker for the exact current route", () => {
  const now = 1_000_000;
  const marker = JSON.stringify({ at: now - 450, path: "/history?view=all" });
  assert.equal(isRecentBrandRefresh(marker, "/history?view=all", now), true);
  for (const route of ["/", "/history", "/history?view=active"]) {
    assert.equal(isRecentBrandRefresh(marker, route, now), false);
  }
});

test("reload markers expire at the TTL and reject future timestamps", () => {
  const now = 1_000_000;
  const recent = (at: number) =>
    isRecentBrandRefresh(JSON.stringify({ at, path: "/" }), "/", now);
  assert.equal(recent(now), true);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL + 1), true);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL), false);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL - 1), false);
  assert.equal(recent(now + 1), false);
});

test("malformed or mistyped hand-off data cannot cover an unrelated page with a loader", () => {
  const now = 1_000_000;
  for (const marker of [
    null,
    "",
    "not JSON",
    "null",
    "[]",
    "123",
    '"refresh"',
    "{}",
    JSON.stringify({ at: String(now), path: "/" }),
    JSON.stringify({ at: null, path: "/" }),
    JSON.stringify({ at: now, path: ["/"] }),
    JSON.stringify({ at: now }),
    '{"at":1e999,"path":"/"}',
  ]) {
    assert.equal(
      isRecentBrandRefresh(marker, "/", now),
      false,
      marker ?? "null",
    );
  }
});

const idlePull = (): BrandPullState => ({
  action: null,
  lockedAction: null,
  distance: 0,
  moved: false,
});

test("the longer pull keeps former thresholds tentative on both axes", () => {
  assert.equal(BRAND_REFRESH_THRESHOLD, 340);
  for (const distance of [
    96,
    120,
    144,
    192,
    216,
    256,
    272,
    320,
    BRAND_REFRESH_THRESHOLD - 0.01,
  ]) {
    assert.equal(isBrandRefreshPull(0, distance), false);
    assert.equal(isBrandMedicationsPull(distance, 0), false);
    assert.equal(updateBrandPull(idlePull(), 0, distance).lockedAction, null);
    assert.equal(updateBrandPull(idlePull(), distance, 0).lockedAction, null);
  }
});

test("pointer-down thresholds reserve a 16px viewport inset and cap travel at 340px", () => {
  for (const [width, horizontal] of [
    [320, 264],
    [375, 319],
    [390, 334],
    [414, 340],
    [1_440, 340],
  ]) {
    const thresholds = getBrandPullThresholds(40, 40, width, 844);
    assert.equal(thresholds.medications, horizontal);
    assert.equal(thresholds.refresh, 340);
    assert.ok(40 + thresholds.medications <= width - 16);
    assert.ok(Object.isFrozen(thresholds));
  }
  assert.deepEqual(getBrandPullThresholds(40, 40, 844, 320), {
    medications: 340,
    refresh: 264,
  });
  // Callers pass visual viewport right/bottom coordinates, including offsets.
  assert.deepEqual(getBrandPullThresholds(104, 80, 364, 400), {
    medications: 244,
    refresh: 304,
  });
});

test("threshold snapshots stay fixed across viewport resizing and a new gesture can recapture", () => {
  const captured = getBrandPullThresholds(40, 40, 390, 844);
  const afterResize = getBrandPullThresholds(40, 40, 320, 844);
  let state = updateBrandPull(idlePull(), 300, 0, captured);
  assert.equal(state.lockedAction, null);
  assert.equal(getBrandPullRelease(state, "/history", captured), null);
  state = updateBrandPull(state, 334, 0, captured);
  assert.equal(state.lockedAction, "medications");
  assert.equal(getBrandPullRelease(state, "/history", captured), "medications");
  assert.deepEqual(captured, { medications: 334, refresh: 340 });
  const nextGesture = updateBrandPull(idlePull(), 264, 0, afterResize);
  assert.equal(
    getBrandPullRelease(nextGesture, "/", afterResize),
    "medications",
  );
  assert.equal(
    getBrandPullRelease(nextGesture, "/medications", afterResize),
    "home",
  );
});

test("adaptive thresholds do not normalize physical direction or alter first-axis locking", () => {
  const thresholds = getBrandPullThresholds(40, 40, 320, 844);
  // Unequal normalized progress must not turn this physical diagonal into Medications.
  const diagonal = updateBrandPull(idlePull(), 250, 200, thresholds);
  assert.equal(diagonal.action, null);
  assert.equal(diagonal.lockedAction, null);
  let state = updateBrandPull(idlePull(), 0, 300, thresholds);
  assert.equal(state.action, "refresh");
  assert.equal(state.lockedAction, null);
  state = updateBrandPull(state, 264, 0, thresholds);
  assert.equal(state.lockedAction, "medications");
  assert.equal(
    getBrandPullRelease(state, "/history", thresholds),
    "medications",
  );
  // A coalesced crossing followed by cross-axis movement remains locked,
  // but the retracted horizontal distance disarms its release.
  state = updateBrandPull(state, 0, 400, thresholds);
  assert.equal(state.action, "medications");
  assert.equal(state.lockedAction, "medications");
  assert.equal(getBrandPullRelease(state, "/history", thresholds), null);
  state = updateBrandPull(state, 264, 400, thresholds);
  assert.equal(
    getBrandPullRelease(state, "/history", thresholds),
    "medications",
  );
});

test("adaptive final-up crossings and exact retraction boundaries apply on both axes", () => {
  const thresholds = getBrandPullThresholds(40, 40, 320, 320);
  for (const action of ["medications", "refresh"] as const) {
    const point = (distance: number): [number, number] =>
      action === "medications" ? [distance, 0] : [0, distance];
    const threshold = getBrandPullThreshold(action, thresholds);
    const before = updateBrandPull(
      idlePull(),
      ...point(threshold - 0.01),
      thresholds,
    );
    assert.equal(before.lockedAction, null);
    // A final up sample can be the first recorded threshold crossing.
    const at = updateBrandPull(before, ...point(threshold), thresholds);
    assert.equal(at.lockedAction, action);
    assert.equal(getBrandPullRelease(at, "/history", thresholds), action);
    const back = updateBrandPull(at, ...point(threshold - 0.01), thresholds);
    assert.equal(back.lockedAction, action);
    assert.equal(getBrandPullRelease(back, "/history", thresholds), null);
  }
  assert.equal(isBrandMedicationsPull(264, 0, thresholds), true);
  assert.equal(isBrandRefreshPull(0, 264, thresholds), true);
  assert.equal(isBrandMedicationsPull(263.99, 0, thresholds), false);
  assert.equal(isBrandRefreshPull(0, 263.99, thresholds), false);
});

test("invalid or unusable viewport travel and thresholds never create a tiny ready gesture", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(
      getBrandPullThresholds(invalid, 40, 320, 844).medications,
      340,
    );
    assert.equal(getBrandPullThresholds(40, invalid, 320, 844).refresh, 340);
    assert.equal(getBrandPullThresholds(40, 40, invalid, 844).medications, 340);
    assert.equal(getBrandPullThresholds(40, 40, 320, invalid).refresh, 340);
  }
  for (const travel of [-100, 0, 8])
    assert.equal(
      getBrandPullThresholds(40, 40, 40 + 16 + travel, 844).medications,
      340,
    );
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0, 8]) {
    const thresholds = { medications: invalid, refresh: invalid };
    assert.equal(getBrandPullThreshold("medications", thresholds), 340);
    assert.equal(getBrandPullThreshold("refresh", thresholds), 340);
    const state = updateBrandPull(idlePull(), 20, 0, thresholds);
    assert.equal(state.lockedAction, null);
    assert.equal(getBrandPullRelease(state, "/", thresholds), null);
  }
  assert.equal(
    getBrandPullThreshold("medications", { medications: 500, refresh: 500 }),
    340,
  );
  assert.equal(getBrandPullThreshold(null), 340);
  assert.equal(getBrandPullThreshold("medications"), 340);
});

test("a tentative downward pull can turn right and commit Medications only at its threshold", () => {
  const initial = idlePull();
  const down = updateBrandPull(initial, 0, 50);
  assert.equal(down.action, "refresh");
  assert.equal(down.lockedAction, null);
  const right = updateBrandPull(down, 70, 0);
  assert.equal(right.action, "medications");
  assert.equal(right.lockedAction, null);
  assert.equal(
    updateBrandPull(right, BRAND_REFRESH_THRESHOLD, 0).lockedAction,
    "medications",
  );
  assert.deepEqual(
    initial,
    idlePull(),
    "the transition never mutates its previous input",
  );
});

test("a tentative rightward pull can turn down and lock Refresh", () => {
  let state = updateBrandPull(idlePull(), 50, 0);
  state = updateBrandPull(state, 0, 70);
  assert.equal(state.action, "refresh");
  assert.equal(state.lockedAction, null);
  state = updateBrandPull(state, 0, BRAND_REFRESH_THRESHOLD);
  assert.equal(state.lockedAction, "refresh");
});

test("neutral diagonals recover without cancelling or locking either direction", () => {
  let state = updateBrandPull(idlePull(), 50, 50);
  assert.equal(state.action, null);
  assert.equal(state.lockedAction, null);
  assert.equal(state.distance, 0);
  state = updateBrandPull(state, 0, 80);
  assert.equal(state.action, "refresh");
  assert.equal(state.distance, 80);
  assert.equal(state.lockedAction, null);
});

test("each direction locks exactly at the threshold and ignores subsequent opposite-axis dominance", () => {
  for (const action of ["medications", "refresh"] as const) {
    const point = (along: number, cross: number) =>
      action === "medications" ? [along, cross] : [cross, along];
    let [x, y] = point(BRAND_REFRESH_THRESHOLD - 0.01, 0);
    let state = updateBrandPull(idlePull(), x, y);
    assert.equal(state.lockedAction, null);
    [x, y] = point(BRAND_REFRESH_THRESHOLD, 0);
    state = updateBrandPull(state, x, y);
    assert.equal(state.lockedAction, action);
    [x, y] = point(BRAND_REFRESH_THRESHOLD + 4, 3 * BRAND_REFRESH_THRESHOLD);
    state = updateBrandPull(state, x, y);
    assert.equal(state.action, action);
    assert.equal(state.lockedAction, action);
    assert.equal(state.distance, BRAND_REFRESH_THRESHOLD + 4);
  }
});

test("retraction disarms release but never unlocks or changes the committed axis", () => {
  for (const action of ["medications", "refresh"] as const) {
    const point = (along: number, cross: number) =>
      action === "medications" ? [along, cross] : [cross, along];
    let [x, y] = point(BRAND_REFRESH_THRESHOLD + 14, 0);
    let state = updateBrandPull(idlePull(), x, y);
    for (const along of [40, 0, -30]) {
      [x, y] = point(along, 3 * BRAND_REFRESH_THRESHOLD);
      state = updateBrandPull(state, x, y);
      assert.equal(state.lockedAction, action);
      assert.equal(state.action, action);
      assert.equal(state.distance, Math.max(0, along));
      assert.ok(state.distance < BRAND_REFRESH_THRESHOLD);
    }
    [x, y] = point(BRAND_REFRESH_THRESHOLD + 4, 3 * BRAND_REFRESH_THRESHOLD);
    state = updateBrandPull(state, x, y);
    assert.equal(state.distance, BRAND_REFRESH_THRESHOLD + 4);
    assert.equal(state.lockedAction, action);
  }
});

test("readiness reverses at the threshold while the first reached axis stays locked", () => {
  for (const action of ["medications", "refresh"] as const) {
    let state = idlePull();
    const samples = [
      [BRAND_REFRESH_THRESHOLD - 0.01, false],
      [BRAND_REFRESH_THRESHOLD, true],
      [BRAND_REFRESH_THRESHOLD - 1, false],
      [0, false],
      [BRAND_REFRESH_THRESHOLD + 1, true],
    ] as const;
    for (const [index, [along, ready]] of samples.entries()) {
      const cross = index > 1 ? 3 * BRAND_REFRESH_THRESHOLD : 0;
      state = updateBrandPull(
        state,
        action === "medications" ? along : cross,
        action === "refresh" ? along : cross,
      );
      assert.equal(state.action, action);
      assert.equal(state.lockedAction, index === 0 ? null : action);
      assert.equal(state.distance >= BRAND_REFRESH_THRESHOLD, ready);
    }
  }
});

test("the final pointer-up point may commit a threshold without a final move event", () => {
  assert.equal(
    updateBrandPull(idlePull(), BRAND_REFRESH_THRESHOLD + 4, 0).lockedAction,
    "medications",
  );
  assert.equal(
    updateBrandPull(idlePull(), 0, BRAND_REFRESH_THRESHOLD + 4).lockedAction,
    "refresh",
  );
});

test("a coalesced crossing stays locked even if the latest point has turned or retracted", () => {
  let state = idlePull();
  for (const [x, y] of [
    [50, 0],
    [BRAND_REFRESH_THRESHOLD + 14, 0],
    [0, BRAND_REFRESH_THRESHOLD + 34],
  ])
    state = updateBrandPull(state, x, y);
  assert.equal(state.lockedAction, "medications");
  assert.equal(state.action, "medications");
  assert.equal(state.distance, 0);
});

test("slop protects taps while a moved gesture cannot become a tap after retreat", () => {
  let state = updateBrandPull(idlePull(), BRAND_REFRESH_SLOP, 0);
  assert.equal(state.moved, false);
  assert.equal(state.action, null);
  state = updateBrandPull(state, 20, 0);
  state = updateBrandPull(state, 0, 0);
  assert.equal(state.moved, true);
  assert.equal(state.lockedAction, null);
  assert.equal(state.distance, 0);
});

test("ambiguous or reverse pulls do not arm a fresh gesture and clear intent can recover", () => {
  for (const [x, y] of [
    [120, 120],
    [-120, 0],
    [0, -120],
  ]) {
    let state = updateBrandPull(idlePull(), x, y);
    assert.equal(state.lockedAction, null);
    assert.equal(state.distance, 0);
    state = updateBrandPull(state, 0, BRAND_REFRESH_THRESHOLD + 4);
    assert.equal(state.lockedAction, "refresh");
  }
});

test("invalid samples cannot commit an action or preserve a ready distance", () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(
      updateBrandPull(idlePull(), invalid, BRAND_REFRESH_THRESHOLD + 4)
        .lockedAction,
      null,
    );
    const locked = updateBrandPull(idlePull(), BRAND_REFRESH_THRESHOLD + 4, 0);
    const next = updateBrandPull(locked, invalid, BRAND_REFRESH_THRESHOLD + 4);
    assert.equal(next.lockedAction, "medications");
    assert.equal(next.distance, 0);
  }
});

const closePose = (actual: BrandPullPose, expected: BrandPullPose) => {
  for (const key of ["x", "y", "progress"] as const)
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-8, key);
};

test("drag following is time-based across60Hz and120Hz frame intervals", () => {
  const target = { x: 40, y: 30, progress: 1 };
  const follow = (frames: number, step: number) => {
    let pose = { x: 0, y: 0, progress: 0 };
    for (let i = 0; i < frames; i++)
      pose = advanceBrandPullMotion(pose, target, step, false);
    return pose;
  };
  closePose(follow(6, 16), follow(12, 8));
  closePose(follow(6, 16), follow(4, 24));
});

test("direction changes interpolate from the visible pose instead of jumping axes", () => {
  const current = { x: 0, y: 40, progress: 0.5 };
  const target = { x: 40, y: 0, progress: 0.8 };
  const next = advanceBrandPullMotion(current, target, 16, false);
  assert.ok(next.x > 0 && next.x < 40);
  assert.ok(next.y > 0 && next.y < 40);
  assert.ok(next.progress > 0.5 && next.progress < 0.8);
  assert.deepEqual(current, { x: 0, y: 40, progress: 0.5 });
});

test("return easing is gentle, bounded and eventually stops exactly at origin", () => {
  const start = { x: 46, y: 30, progress: 1 },
    target = { x: 0, y: 0, progress: 0 };
  assert.ok(
    advanceBrandPullMotion(start, target, 16, true).x >
      advanceBrandPullMotion(start, target, 16, false).x,
  );
  let pose = start;
  for (let i = 0; i < 100; i++) {
    const next = advanceBrandPullMotion(pose, target, 16, true);
    assert.ok(next.x >= 0 && next.x <= pose.x);
    assert.ok(next.y >= 0 && next.y <= pose.y);
    assert.ok(next.progress >= 0 && next.progress <= pose.progress);
    pose = next;
  }
  assert.deepEqual(pose, target);
});

test("a retained re-grab pose follows its new target without resetting or overshooting", () => {
  const pose = { x: 20, y: 10, progress: 0 },
    target = { x: 50, y: 10, progress: 0.6 };
  const next = advanceBrandPullMotion(pose, target, 16, false);
  assert.ok(next.x > 20 && next.x < 50);
  assert.equal(next.y, 10);
});

test("invalid elapsed time cannot jump motion, and long frames use a bounded catch-up", () => {
  const pose = { x: 0, y: 0, progress: 0 },
    target = { x: 40, y: 30, progress: 1 };
  for (const elapsed of [NaN, Infinity, -20, 0])
    assert.deepEqual(
      advanceBrandPullMotion(pose, target, elapsed, false),
      pose,
    );
  closePose(
    advanceBrandPullMotion(pose, target, 1000, false),
    advanceBrandPullMotion(pose, target, 64, false),
  );
});

test("the separate exchange follows the same path at 60Hz and 120Hz", () => {
  const follow = (frames: number, step: number) => {
    let exchange = 0;
    for (let frame = 0; frame < frames; frame++)
      exchange = advanceBrandPullExchange(exchange, 1, step);
    return exchange;
  };
  assert.ok(Math.abs(follow(18, 1_000 / 60) - follow(36, 1_000 / 120)) < 1e-10);
  assert.ok(Math.abs(follow(18, 1_000 / 60) - follow(12, 25)) < 1e-10);
  const at150ms = follow(9, 1_000 / 60);
  const feedback = getBrandPullFeedback(1, 1, 0, "refresh", at150ms);
  assert.ok(
    feedback.pillOpacity > 0.05,
    "the pills have not instantly disappeared on a fast pull",
  );
  assert.ok(
    feedback.reveal > 0 && feedback.reveal < 0.4,
    "the replacement is only beginning to arrive at150ms",
  );
  assert.equal(follow(90, 1_000 / 60), BRAND_PULL_EXCHANGE_END);
});

test("exchange retraction and cancellation continue from the visible phase and settle", () => {
  let exchange = 0;
  for (let frame = 0; frame < 14; frame++)
    exchange = advanceBrandPullExchange(exchange, 1, 16);
  const turning = exchange;
  exchange = advanceBrandPullExchange(exchange, 0, 16);
  assert.ok(exchange > 0 && exchange < turning);
  const grabbedAgain = advanceBrandPullExchange(exchange, 1, 16);
  assert.ok(grabbedAgain > exchange && grabbedAgain < BRAND_PULL_EXCHANGE_END);
  for (let frame = 0; frame < 90; frame++) {
    const next = advanceBrandPullExchange(exchange, 0, 16);
    assert.ok(next >= 0 && next <= exchange);
    exchange = next;
  }
  assert.equal(exchange, 0);
  assert.equal(
    getBrandPullFeedback(0, 0, 0, "refresh", exchange).pillOpacity,
    1,
  );
});

test("exchange progress is capped independently of threshold travel and rejects invalid timing", () => {
  const phase = 0.2;
  for (const elapsed of [NaN, Infinity, -Infinity, -10, 0])
    assert.equal(advanceBrandPullExchange(phase, 1, elapsed), phase);
  assert.equal(
    advanceBrandPullExchange(phase, 1, 1_000),
    advanceBrandPullExchange(phase, 1, 64),
  );
  assert.equal(
    advanceBrandPullExchange(phase, 1, 16),
    advanceBrandPullExchange(phase, BRAND_PULL_EXCHANGE_END, 16),
  );
  for (const current of [NaN, Infinity, -Infinity, -1e9, 0, 0.2, 1, 1e9]) {
    for (const target of [NaN, Infinity, -Infinity, -1e9, 0, 0.2, 1, 1e9]) {
      const next = advanceBrandPullExchange(current, target, 16);
      assert.ok(Number.isFinite(next));
      assert.ok(next >= 0 && next <= BRAND_PULL_EXCHANGE_END);
    }
  }
  assert.equal(
    advanceBrandPullExchange(BRAND_PULL_EXCHANGE_END - 0.0001, 1, 16),
    BRAND_PULL_EXCHANGE_END,
  );
  assert.equal(advanceBrandPullExchange(0.0001, 0, 16), 0);
});

test("adaptive readiness preserves the same physical 112px pill exchange and its timing", () => {
  assert.equal(BRAND_PULL_EXCHANGE_DISTANCE, 112);
  assert.equal(BRAND_PULL_EXCHANGE_END * BRAND_REFRESH_THRESHOLD, 112);
  const small = getBrandPullThresholds(40, 40, 320, 844);
  for (const distance of [8, 24, 56, 72, 88, 112, 264, 340]) {
    let exchange = 0;
    for (let frame = 0; frame < 9; frame++)
      exchange = advanceBrandPullExchange(
        exchange,
        distance / BRAND_REFRESH_THRESHOLD,
        1_000 / 60,
      );
    const adaptive = getBrandPullFeedback(
      distance / small.medications,
      0,
      0,
      "medications",
      exchange,
    );
    const full = getBrandPullFeedback(
      distance / BRAND_REFRESH_THRESHOLD,
      0,
      0,
      "medications",
      exchange,
    );
    assert.equal(adaptive.pillOpacity, full.pillOpacity);
    assert.equal(adaptive.pillScale, full.pillScale);
    assert.equal(adaptive.pillTurn, full.pillTurn);
    assert.equal(adaptive.reveal, full.reveal);
  }
});

const closeSpring = (actual: BrandPullSpring, expected: BrandPullSpring) => {
  for (const key of ["value", "velocity"] as const)
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, key);
};

test("the analytic readiness spring follows the same path at 60Hz and 120Hz", () => {
  const follow = (frames: number, step: number) => {
    let spring: BrandPullSpring = { value: 0, velocity: 0 };
    for (let frame = 0; frame < frames; frame++)
      spring = advanceBrandPullSpring(spring, 1, step);
    return spring;
  };
  closeSpring(follow(30, 1_000 / 60), follow(60, 1_000 / 120));
  closeSpring(follow(30, 1_000 / 60), follow(20, 25));
});

test("ready and home springs overshoot within a bounded response and settle exactly", () => {
  for (const [start, target] of [
    [0, 1],
    [1, 0],
  ] as const) {
    let spring: BrandPullSpring = { value: start, velocity: 0 };
    let minimum: number = start;
    let maximum: number = start;
    for (let frame = 0; frame < 240; frame++) {
      spring = advanceBrandPullSpring(spring, target, 1_000 / 60);
      minimum = Math.min(minimum, spring.value);
      maximum = Math.max(maximum, spring.value);
      assert.ok(spring.value > -0.5 && spring.value < 1.5);
    }
    if (target === 1) assert.ok(maximum > 1.25 && maximum < 1.35);
    else assert.ok(minimum < -0.25 && minimum > -0.35);
    assert.deepEqual(spring, { value: target, velocity: 0 });
  }
});

test("retraction reverses a moving ready spring without resetting its current pose", () => {
  const initial = Object.freeze({ value: 0.6, velocity: 5 });
  const retreat = advanceBrandPullSpring(initial, 0, 8);
  const continuing = advanceBrandPullSpring(initial, 1, 8);
  assert.ok(
    retreat.value > initial.value,
    "existing momentum remains continuous",
  );
  assert.ok(retreat.value < continuing.value);
  assert.ok(retreat.velocity < initial.velocity);
  assert.deepEqual(initial, { value: 0.6, velocity: 5 });
  let spring = retreat;
  for (let frame = 0; frame < 240; frame++)
    spring = advanceBrandPullSpring(spring, 0, 16);
  assert.deepEqual(spring, { value: 0, velocity: 0 });
});

test("a home impulse rebounds through origin and recovers without an ongoing animation", () => {
  let spring: BrandPullSpring = { value: 0, velocity: -6 };
  let minimum = 0;
  let maximum = 0;
  for (let frame = 0; frame < 240; frame++) {
    spring = advanceBrandPullSpring(spring, 0, 16);
    minimum = Math.min(minimum, spring.value);
    maximum = Math.max(maximum, spring.value);
  }
  assert.ok(minimum < -0.15 && minimum > -0.6);
  assert.ok(maximum > 0 && maximum < 0.2);
  assert.deepEqual(spring, { value: 0, velocity: 0 });
});

test("spring time is bounded and malformed inputs cannot poison the animation", () => {
  const spring = Object.freeze({ value: 0.4, velocity: 2 });
  for (const elapsed of [NaN, Infinity, -Infinity, -20, 0])
    assert.deepEqual(advanceBrandPullSpring(spring, 1, elapsed), spring);
  closeSpring(
    advanceBrandPullSpring(spring, 1, 1_000),
    advanceBrandPullSpring(spring, 1, 64),
  );
  assert.deepEqual(
    advanceBrandPullSpring({ value: 1.0001, velocity: 0.0001 }, 1, 16),
    { value: 1, velocity: 0 },
  );
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(
      advanceBrandPullSpring({ value: invalid, velocity: invalid }, 1, 16),
      { value: 1, velocity: 0 },
    );
    assert.deepEqual(
      advanceBrandPullSpring(
        { value: invalid, velocity: invalid },
        invalid,
        16,
      ),
      { value: 0, velocity: 0 },
    );
  }
  assert.deepEqual(
    advanceBrandPullSpring(
      { value: -Number.MAX_VALUE, velocity: Number.MAX_VALUE },
      Number.MAX_VALUE,
      16,
    ),
    { value: Number.MAX_VALUE, velocity: 0 },
  );
});

test("the resting face preserves the original pills and background until the exchange begins", () => {
  const resting = getBrandPullFeedback(0, 0, 0, null);
  assert.equal(resting.buttonScale, 1);
  assert.equal(resting.pillOpacity, 1);
  assert.equal(resting.pillScale, 1);
  assert.equal(resting.iconScale, 0.25);
  assert.equal(resting.reveal, 0);
  assert.equal(resting.wash, 0);
  assert.equal(resting.edge, 0);
  const first = getBrandPullFeedback(
    8 / BRAND_REFRESH_THRESHOLD,
    0,
    0,
    "refresh",
  );
  assert.equal(first.wash, 0, "the face begins in its original color");
  assert.equal(
    first.edge,
    0,
    "the first pulling part retains the original border",
  );
  assert.equal(first.reveal, 0, "the replacement glyph waits for the pills");
  assert.ok(first.pillOpacity < 1 && first.pillOpacity > 0);
  assert.ok(first.pillScale < 1 && first.pillTurn < 0);
  const exchanged = getBrandPullFeedback(
    112 / BRAND_REFRESH_THRESHOLD,
    0,
    0,
    "medications",
  );
  assert.equal(exchanged.pillOpacity, 0);
  assert.equal(exchanged.reveal, 1);
  assert.ok(exchanged.iconScale < 0.6, "the new glyph still has room to grow");
});

test("the longer exchange stays reversible without ever tinting the black face", () => {
  const positions = [0, 8, 24, 48, 72, 88, 112, BRAND_REFRESH_THRESHOLD];
  let previousPills = 1;
  let previousGlyph = 0;
  for (const pixels of positions) {
    const progress = pixels / BRAND_REFRESH_THRESHOLD;
    const feedback = getBrandPullFeedback(progress, 0, 0, "refresh");
    assert.equal(feedback.wash, 0);
    assert.ok(feedback.pillOpacity <= previousPills);
    assert.ok(feedback.reveal >= previousGlyph);
    previousPills = feedback.pillOpacity;
    previousGlyph = feedback.reveal;
    const sideways = getBrandPullFeedback(progress, 0, 0, "medications");
    assert.equal(sideways.pillOpacity, feedback.pillOpacity);
    assert.equal(sideways.reveal, feedback.reveal);
    assert.equal(sideways.wash, 0);
  }
  const early = getBrandPullFeedback(
    24 / BRAND_REFRESH_THRESHOLD,
    0,
    0,
    "refresh",
  );
  assert.ok(
    early.pillOpacity > 0.75,
    "pills remain visible beyond the old exchange endpoint",
  );
  assert.equal(early.reveal, 0);
  const midway = getBrandPullFeedback(
    72 / BRAND_REFRESH_THRESHOLD,
    0,
    0,
    "refresh",
  );
  assert.ok(midway.pillOpacity > 0 && midway.pillOpacity < 1);
  assert.ok(midway.reveal > 0 && midway.reveal < 1);
  assert.equal(previousPills, 0);
  assert.equal(previousGlyph, 1);
  for (const pixels of positions.toReversed()) {
    const progress = pixels / BRAND_REFRESH_THRESHOLD;
    assert.deepEqual(
      getBrandPullFeedback(progress, 0, 0, "refresh"),
      getBrandPullFeedback(progress, 0, 0, "refresh", progress),
    );
  }
});

test("a slower exchange clock never delays geometry or authoritative readiness", () => {
  const immediate = getBrandPullFeedback(1, 1, 0, "refresh");
  const delayed = getBrandPullFeedback(
    1,
    1,
    0,
    "refresh",
    24 / BRAND_REFRESH_THRESHOLD,
  );
  assert.ok(delayed.pillOpacity > 0.75);
  assert.equal(delayed.reveal, 0);
  assert.equal(delayed.readiness, immediate.readiness);
  assert.equal(delayed.buttonScale, immediate.buttonScale);
  assert.equal(delayed.iconScale, immediate.iconScale);
  assert.equal(delayed.iconTurn, immediate.iconTurn);
  assert.equal(delayed.edge, immediate.edge);
  assert.equal(delayed.wash, 0);
  const released = updateBrandPull(idlePull(), 0, BRAND_REFRESH_THRESHOLD);
  assert.equal(getBrandPullRelease(released, "/history"), "refresh");
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(
      getBrandPullFeedback(1, 1, 0, "refresh", invalid),
      getBrandPullFeedback(1, 1, 0, "refresh", 0),
    );
  }
  const finished = getBrandPullFeedback(
    1,
    1,
    0,
    "refresh",
    112 / BRAND_REFRESH_THRESHOLD,
  );
  assert.equal(finished.pillOpacity, 0);
  assert.equal(finished.reveal, 1);
});

test("both directions shrink during the pull then hold the button 25% larger when armed", () => {
  for (const action of ["medications", "refresh"] as const) {
    const halfway = getBrandPullFeedback(0.5, 0, 0, action);
    const beforeReady = getBrandPullFeedback(1, 0, 0, action);
    const ready = getBrandPullFeedback(1, 1, 0, action);
    assert.ok(
      halfway.buttonScale < 1 && halfway.buttonScale > beforeReady.buttonScale,
    );
    assert.ok(halfway.iconScale > 0.25 && halfway.iconScale < 1);
    assert.equal(halfway.buttonTilt > 0, action === "medications");
    assert.equal(ready.buttonScale, 1.25);
    assert.ok(Math.abs(ready.iconScale - 1.14) < 1e-12);
    assert.equal(ready.iconTurn, 0);
    assert.equal(ready.buttonTilt, 0);
    const overshoot = getBrandPullFeedback(1, 1.3, 0, action);
    assert.ok(overshoot.buttonScale > ready.buttonScale);
    assert.ok(overshoot.iconScale > ready.iconScale);
    assert.equal(overshoot.iconTurn, ready.iconTurn);
    assert.ok(overshoot.flare > 0);
  }
});

test("retracting progress reverses the glyph and home undershoot recovers to the resting face", () => {
  const halfway = getBrandPullFeedback(0.5, 0, 0, "refresh");
  const retracting = getBrandPullFeedback(0.25, -0.2, 0, "refresh");
  assert.ok(retracting.buttonScale > halfway.buttonScale);
  assert.ok(retracting.iconScale < halfway.iconScale);
  assert.ok(retracting.iconTurn < halfway.iconTurn);
  const home = getBrandPullFeedback(0, 0, -0.3, "refresh");
  assert.equal(home.reveal, 0);
  assert.ok(home.buttonScale < 1);
  assert.ok(home.buttonTilt < 0);
  assert.ok(home.flare > 0);
  assert.deepEqual(
    getBrandPullFeedback(0, 0, 0, "refresh"),
    getBrandPullFeedback(0, 0, 0, null),
  );
});

test("release and cancellation shrink home without rotating the last painted glyph angle", () => {
  for (const action of ["refresh", "medications"] as const) {
    for (const initialProgress of [1, 0.72, 0.18]) {
      let pose = { x: 0, y: 0, progress: initialProgress };
      let exchange = Math.min(initialProgress, BRAND_PULL_EXCHANGE_END);
      let readiness = { value: initialProgress === 1 ? 1 : 0, velocity: 0 };
      let home = { value: 0, velocity: -8 };
      const initial = getBrandPullFeedback(
        pose.progress,
        readiness.value,
        home.value,
        action,
        exchange,
      );
      const heldIconTurn = initial.iconTurn;
      let final = initial;
      for (let frame = 0; frame < 180; frame++) {
        pose = advanceBrandPullMotion(
          pose,
          { x: 0, y: 0, progress: 0 },
          1_000 / 60,
          true,
        );
        exchange = advanceBrandPullExchange(exchange, 0, 1_000 / 60);
        readiness = advanceBrandPullSpring(readiness, 0, 1_000 / 60);
        home = advanceBrandPullSpring(home, 0, 1_000 / 60);
        final = getBrandPullFeedback(
          pose.progress,
          readiness.value,
          home.value,
          action,
          exchange,
          heldIconTurn,
        );
        assert.equal(final.iconTurn, heldIconTurn);
        for (const value of Object.values(final))
          assert.ok(Number.isFinite(value));
      }
      assert.equal(pose.progress, 0);
      assert.equal(final.reveal, 0);
      assert.ok(final.iconScale < initial.iconScale);
      assert.equal(final.buttonScale, 1);
    }
  }
});

test("the held return angle changes no other feedback and releasing the hold restores active pull rotation", () => {
  for (const action of ["refresh", "medications"] as const) {
    const captured = getBrandPullFeedback(0.63, 0, 0, action).iconTurn;
    const live = getBrandPullFeedback(0.28, -0.1, -0.2, action, 0.2);
    const held = getBrandPullFeedback(0.28, -0.1, -0.2, action, 0.2, captured);
    assert.notEqual(live.iconTurn, captured);
    assert.deepEqual(held, { ...live, iconTurn: captured });
    assert.deepEqual(
      getBrandPullFeedback(0.28, -0.1, -0.2, action, 0.2, undefined),
      live,
    );
    const resumed = getBrandPullFeedback(0.5, 0, 0, action, 0.2);
    assert.ok(resumed.iconTurn > live.iconTurn);
    assert.notEqual(resumed.iconTurn, captured);
  }
});

test("only finite held angles override the normal feedback without leaking invalid numbers", () => {
  for (const progress of [0, 0.45, 1, Number.NaN]) {
    const live = getBrandPullFeedback(progress, 0.8, -0.25, "refresh");
    for (const invalid of [Number.NaN, Infinity, -Infinity]) {
      const feedback = getBrandPullFeedback(
        progress,
        0.8,
        -0.25,
        "refresh",
        progress,
        invalid,
      );
      assert.deepEqual(feedback, live);
      for (const value of Object.values(feedback))
        assert.ok(Number.isFinite(value));
    }
    for (const angle of [-283.125, 0, 45.75]) {
      assert.equal(
        getBrandPullFeedback(progress, 0.8, -0.25, "refresh", progress, angle)
          .iconTurn,
        angle,
      );
    }
  }
});

test("feedback stays finite and within visual bounds for overshoot and malformed inputs", () => {
  const values = [NaN, Infinity, -Infinity, -1e9, 0, 0.5, 1, 1e9];
  for (const progress of values)
    for (const readiness of values)
      for (const home of values)
        for (const action of [null, "refresh", "medications"] as const) {
          const feedback = getBrandPullFeedback(
            progress,
            readiness,
            home,
            action,
          );
          for (const value of Object.values(feedback))
            assert.ok(Number.isFinite(value));
          assert.ok(feedback.reveal >= 0 && feedback.reveal <= 1);
          assert.ok(
            feedback.buttonScale >= 0.72 && feedback.buttonScale <= 1.75,
          );
          assert.ok(feedback.iconScale >= 0.2 && feedback.iconScale <= 3.4);
          assert.ok(feedback.flare >= 0 && feedback.flare <= 1);
          assert.ok(Math.abs(feedback.buttonTilt) <= 7.6 + 1e-10);
          assert.ok(
            feedback.iconTurn >= -319.6 - 1e-10 &&
              feedback.iconTurn <= 9.6 + 1e-10,
          );
        }
});

test("the actual ready spring rebounds to a larger charged rest without adding threshold rotation", () => {
  let spring: BrandPullSpring = { value: 0, velocity: 0 };
  let peak = 1;
  let buttonPeak = 1;
  for (let frame = 0; frame < 180; frame++) {
    spring = advanceBrandPullSpring(spring, 1, 1_000 / 60);
    const feedback = getBrandPullFeedback(1, spring.value, 0, "refresh");
    peak = Math.max(peak, feedback.iconScale);
    buttonPeak = Math.max(buttonPeak, feedback.buttonScale);
    assert.equal(feedback.iconTurn, 0);
  }
  assert.ok(peak > 3.1 && peak <= 3.4);
  assert.ok(buttonPeak > 1.6 && buttonPeak <= 1.75);
  assert.equal(
    getBrandPullFeedback(1, spring.value, 0, "refresh").buttonScale,
    1.25,
  );
  assert.ok(
    Math.abs(
      getBrandPullFeedback(1, spring.value, 0, "refresh").iconScale - 1.14,
    ) < 1e-12,
  );
});

test("a rightward release opens Medications from Today and other pages", () => {
  const medications = updateBrandPull(idlePull(), BRAND_REFRESH_THRESHOLD, 0);
  for (const pathname of ["/", "/history", "/goals", "/guide"])
    assert.equal(getBrandPullRelease(medications, pathname), "medications");
});

test("a rightward release already on Medications only rolls back", () => {
  const medications = updateBrandPull(idlePull(), BRAND_REFRESH_THRESHOLD, 0);
  assert.equal(getBrandPullRelease(medications, "/medications"), "home");
});

test("a downward release refreshes on both Today and Medications", () => {
  const refresh = updateBrandPull(idlePull(), 0, BRAND_REFRESH_THRESHOLD);
  for (const pathname of ["/", "/history", "/medications"])
    assert.equal(getBrandPullRelease(refresh, pathname), "refresh");
});

test("a retracted, incomplete or invalid release cannot trigger a destination", () => {
  const medications = updateBrandPull(idlePull(), BRAND_REFRESH_THRESHOLD, 0);
  const retracted = updateBrandPull(
    medications,
    BRAND_REFRESH_THRESHOLD - 0.01,
    0,
  );
  assert.equal(getBrandPullRelease(retracted, "/"), null);
  assert.equal(getBrandPullRelease(retracted, "/history"), null);
  assert.equal(getBrandPullRelease(retracted, "/medications"), null);
  assert.equal(getBrandPullRelease(idlePull(), "/"), null);
  for (const distance of [NaN, Infinity, -Infinity])
    assert.equal(getBrandPullRelease({ ...medications, distance }, "/"), null);
});
