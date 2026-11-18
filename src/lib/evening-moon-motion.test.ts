import assert from "node:assert/strict";
import test from "node:test";
import { getEveningMoonMotion } from "./evening-moon-motion";

const model = getEveningMoonMotion();

test("the compound moon arc is seamless in pose and sampled velocity", () => {
  assert.equal(model.duration, 14_400);
  assert.equal(model.frames.length, 241);
  const first = model.frames[0];
  const last = model.frames.at(-1)!;
  assert.deepEqual({ ...last, offset: 0 }, first);

  const seconds = model.duration / 1000 / (model.frames.length - 1);
  for (const field of ["x", "y", "rotation", "scale"] as const) {
    const speeds = model.frames
      .slice(1)
      .map(
        (frame, index) => (frame[field] - model.frames[index][field]) / seconds,
      );
    const largestInteriorChange = Math.max(
      ...speeds.slice(1).map((speed, index) => Math.abs(speed - speeds[index])),
    );
    assert.ok(
      Math.abs(speeds[0] - speeds.at(-1)!) <=
        largestInteriorChange * 1.02 + 1e-7,
    );
  }
});

test("the moon follows a restrained asymmetric hanging path", () => {
  const xs = model.frames.map((frame) => frame.x);
  const ys = model.frames.map((frame) => frame.y);
  const rotations = model.frames.map((frame) => frame.rotation);
  const scales = model.frames.map((frame) => frame.scale);

  assert.ok(Math.min(...xs) < -2);
  assert.ok(Math.max(...xs) > 2);
  assert.ok(Math.min(...ys) < -0.8);
  assert.ok(Math.max(...ys) <= 0.14);
  assert.ok(Math.max(...rotations) < 10);
  assert.ok(Math.min(...rotations) > -10);
  assert.ok(Math.min(...scales) >= 0.98);
  assert.ok(Math.max(...scales) <= 1.02);
  assert.ok(
    model.frames.every((frame) => Object.values(frame).every(Number.isFinite)),
  );
});

test("the face tilt trails the lateral path instead of moving in lockstep", () => {
  const quarter = model.frames.slice(0, 61);
  const lateralPeak = quarter.reduce(
    (best, frame, index) => (frame.x > quarter[best].x ? index : best),
    0,
  );
  const tiltPeak = quarter.reduce(
    (best, frame, index) =>
      frame.rotation > quarter[best].rotation ? index : best,
    0,
  );
  assert.notEqual(tiltPeak, lateralPeak);
  assert.ok(Math.abs(tiltPeak - lateralPeak) < 14);
  assert.equal(getEveningMoonMotion(), model);
  assert.ok(Object.isFrozen(model.frames));
});
