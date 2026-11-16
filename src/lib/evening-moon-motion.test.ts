import assert from "node:assert/strict";
import test from "node:test";
import { getEveningMoonMotion } from "./evening-moon-motion";

const model = getEveningMoonMotion();

test("nonlinear swing period matches the independent pendulum integral and conserves energy", () => {
  const k = Math.sin(model.amplitude / 2);
  const slices = 2048;
  const step = Math.PI / 2 / slices;
  let sum = 0;
  for (let index = 0; index <= slices; index++) {
    const value = 1 / Math.sqrt(1 - (k * Math.sin(index * step)) ** 2);
    sum += value * (index === 0 || index === slices ? 1 : index % 2 ? 4 : 2);
  }
  const expectedPeriod = (4 * step * sum) / 3;
  assert.ok(Math.abs(model.naturalPeriod - expectedPeriod) < 1e-7);
  assert.ok(model.naturalPeriod > Math.PI * 2);
  for (const frame of model.frames) {
    const energy = frame.velocity ** 2 / 2 + 1 - Math.cos(frame.angle);
    assert.ok(Math.abs(energy - model.energy) < 5e-7);
  }
});

test("the complete native loop starts settled and joins the same pose and momentum", () => {
  assert.equal(model.duration, 16_800);
  assert.equal(model.frames.length, 225);
  const { offset: firstOffset, ...first } = model.frames[0];
  const { offset: lastOffset, ...last } = model.frames.at(-1)!;
  assert.equal(firstOffset, 0);
  assert.equal(lastOffset, 1);
  assert.deepEqual(first, last);
  assert.deepEqual(
    [first.x, first.y, first.rotation, first.scale],
    [0, 0, 0, 1],
  );
  assert.ok(model.springSeamError < 1e-8);
  // Check the rendered tracks too: the wrap must not introduce a velocity
  // corner larger than ordinary linear interpolation within the cycle.
  const seconds = model.duration / 1000 / (model.frames.length - 1);
  for (const field of ["x", "y", "rotation", "scale"] as const) {
    const speeds = model.frames
      .slice(1)
      .map(
        (frame, index) => (frame[field] - model.frames[index][field]) / seconds,
      );
    const interior = Math.max(
      ...speeds.slice(1).map((speed, index) => Math.abs(speed - speeds[index])),
    );
    assert.ok(Math.abs(speeds[0] - speeds.at(-1)!) <= interior * 1.01 + 1e-7);
  }
  assert.equal(getEveningMoonMotion(), model);
  assert.ok(Object.isFrozen(model.frames));
});

test("the crescent rises at its turns and carries maximum pendulum speed through the center", () => {
  const center = model.frames[0];
  const turn = model.frames[28];
  const nextCenter = model.frames[56];
  assert.ok(Math.abs(turn.angle - model.amplitude) < 1e-6);
  assert.ok(Math.abs(turn.velocity) < 1e-5);
  assert.ok(Math.abs(nextCenter.angle) < 1e-6);
  assert.ok(Math.abs(nextCenter.velocity) > Math.abs(turn.velocity) + 0.3);
  assert.ok(turn.y < center.y && turn.y < nextCenter.y);
  for (const frame of model.frames) {
    assert.ok(Object.values(frame).every(Number.isFinite));
    assert.ok(Math.abs(frame.x) < 4.2);
    assert.ok(Math.abs(frame.y) < 1);
    assert.ok(Math.abs(frame.rotation) < 26);
    assert.ok(frame.scale >= 0.978 && frame.scale <= 1.022);
  }
});

test("the following spring makes body tilt trail the main swing without a settling reset", () => {
  const firstSwing = model.frames.slice(0, 56);
  const anglePeak = firstSwing.reduce(
    (best, frame, index) =>
      frame.angle > firstSwing[best].angle ? index : best,
    0,
  );
  const tiltPeak = firstSwing.reduce(
    (best, frame, index) =>
      frame.rotation > firstSwing[best].rotation ? index : best,
    0,
  );
  assert.ok(tiltPeak > anglePeak);
  assert.ok(tiltPeak - anglePeak < 10);
  assert.ok(model.springSeamError < 1e-8);
  // Slow depth modulation varies the second swing while all clocks still join.
  assert.notEqual(model.frames[28].scale, model.frames[140].scale);
});
