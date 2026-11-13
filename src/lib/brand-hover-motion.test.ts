import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_HOVER_PLAYBACK_RATE,
  createBrandHoverMotion,
} from "./brand-hover-motion";

const loopNames = [
  "tablet-orbit",
  "tablet-approach-first",
  "tablet-approach-second",
  "tablet-spin-first",
  "tablet-spin-second",
];
function animation(animationName: string) {
  const calls: number[] = [];
  return {
    animationName,
    calls,
    currentTime: 1_234,
    playState: "paused",
    // Deliberately stale: a browser may expose the old rate before its pending
    // playback task runs, including across several rapid enter/leave events.
    playbackRate: 1,
    updatePlaybackRate(rate: number) {
      this.calls.push(rate);
    },
    play() {
      assert.fail("Hover must not resume a CSS-paused animation");
    },
    pause() {
      assert.fail("CSS remains the owner of pause state");
    },
    cancel() {
      assert.fail("Hover must not cancel or restart an animation");
    },
  };
}

test("only the five tablet loops receive the exact one-eighteenth speed boost", () => {
  const loops = loopNames.map(animation);
  const unrelated = [
    animation("topbar-glyph-arrive"),
    animation("topbar-control-arrive"),
    animation("page-refresh-tablet-first"),
    animation("tablet-orbit-extra"),
    {
      calls: [],
      updatePlaybackRate: () => assert.fail("Not a CSS tablet loop"),
    },
  ];
  const source = {
    getAnimations(options: { subtree: true }) {
      assert.equal(this, source);
      assert.deepEqual(options, { subtree: true });
      return [...loops, ...unrelated];
    },
  };
  const motion = createBrandHoverMotion(source);
  motion.update(true);
  assert.equal(BRAND_HOVER_PLAYBACK_RATE, 19 / 18);
  assert.ok(
    Math.abs(7_200 / BRAND_HOVER_PLAYBACK_RATE - 6_821.052631578947) < 1e-9,
  );
  for (const loop of loops) {
    assert.deepEqual(loop.calls, [19 / 18]);
    assert.equal(loop.currentTime, 1_234);
    assert.equal(loop.playState, "paused");
  }
  for (const other of unrelated) assert.deepEqual(other.calls, []);
});

test("leave replaces a pending boost even when the exposed playback rate still says one", () => {
  const loop = animation("tablet-orbit");
  const motion = createBrandHoverMotion({ getAnimations: () => [loop] });
  motion.update(true);
  motion.update(true);
  motion.update(false);
  motion.update(false);
  motion.update(true);
  motion.update(false);
  assert.equal(loop.playbackRate, 1);
  assert.deepEqual(loop.calls, [19 / 18, 1, 19 / 18, 1]);
});

test("cleanup restores the last requested rate once and ignores later hover events", () => {
  const loop = animation("tablet-spin-second");
  const motion = createBrandHoverMotion({ getAnimations: () => [loop] });
  motion.update(true);
  motion.dispose();
  motion.dispose();
  motion.update(true);
  assert.deepEqual(loop.calls, [19 / 18, 1]);
  assert.equal(loop.currentTime, 1_234);
});

test("late and recreated loops adopt the current hover while removed loops return to normal", () => {
  const first = animation("tablet-approach-first");
  const replacement = animation("tablet-approach-first");
  let current = [first];
  const motion = createBrandHoverMotion({ getAnimations: () => current });
  motion.update(true);
  current = [];
  motion.update(false);
  assert.deepEqual(first.calls, [19 / 18, 1]);
  current = [replacement];
  motion.update(true);
  assert.deepEqual(replacement.calls, [19 / 18]);
  motion.dispose();
  assert.deepEqual(first.calls, [19 / 18, 1]);
  assert.deepEqual(replacement.calls, [19 / 18, 1]);
});

test("reduced-motion absence and missing animation APIs retain the CSS fallback", () => {
  for (const source of [{}, { getAnimations: () => [] }]) {
    const motion = createBrandHoverMotion(source);
    assert.doesNotThrow(() => {
      motion.update(true);
      motion.update(false);
      motion.dispose();
    });
  }
  const unsupported = { animationName: "tablet-orbit" };
  const healthy = animation("tablet-spin-first");
  const motion = createBrandHoverMotion({
    getAnimations: () => [unsupported, healthy],
  });
  motion.update(true);
  motion.dispose();
  assert.deepEqual(healthy.calls, [19 / 18, 1]);
});

test("inspection and individual update failures do not strand other pending boosts", () => {
  const healthy = animation("tablet-orbit");
  const broken = {
    animationName: "tablet-spin-first",
    updatePlaybackRate() {
      throw new Error("Detached");
    },
  };
  let unavailable = false;
  const motion = createBrandHoverMotion({
    getAnimations() {
      if (unavailable) throw new Error("Animation inspection unavailable");
      return [broken, healthy];
    },
  });
  assert.doesNotThrow(() => motion.update(true));
  unavailable = true;
  assert.doesNotThrow(() => motion.update(false));
  assert.deepEqual(healthy.calls, [19 / 18, 1]);
  assert.doesNotThrow(() => motion.dispose());
});
