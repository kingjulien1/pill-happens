import assert from "node:assert/strict";
import test from "node:test";
import { getEveningMoonMotion } from "./evening-moon-motion";

const model = getEveningMoonMotion();
const fields = ["x", "y", "rotation", "scale", "opacity"] as const;

test("arrival joins the moving drift without a pose or velocity reset", () => {
  const arrival = model.entry.frames;
  const loop = model.loop.frames;
  assert.deepEqual({ ...arrival.at(-1), offset: 0 }, loop[0]);

  const entryStep = model.entry.duration / 1000 / (arrival.length - 1);
  const loopStep = model.loop.duration / 1000 / (loop.length - 1);
  for (const field of fields) {
    const endingSpeed =
      (arrival.at(-1)![field] - arrival.at(-2)![field]) / entryStep;
    const startingSpeed = (loop[1][field] - loop[0][field]) / loopStep;
    assert.ok(
      Math.abs(endingSpeed - startingSpeed) < 0.06,
      `${field} changes speed at the arrival/loop handoff`,
    );
  }
  assert.ok(
    loop[1].x > loop[0].x,
    "the moon is already travelling at the join",
  );
});

test("the ambient orbit loops with continuous pose and sampled velocity", () => {
  const frames = model.loop.frames;
  assert.deepEqual({ ...frames.at(-1), offset: 0 }, frames[0]);
  const seconds = model.loop.duration / 1000 / (frames.length - 1);
  for (const field of fields) {
    const speeds = frames
      .slice(1)
      .map((frame, index) => (frame[field] - frames[index][field]) / seconds);
    const interiorChange = Math.max(
      ...speeds.slice(1).map((speed, index) => Math.abs(speed - speeds[index])),
    );
    assert.ok(
      Math.abs(speeds[0] - speeds.at(-1)!) <= interiorChange * 1.02 + 1e-7,
      `${field} changes speed at the loop seam`,
    );
  }
});

test("the crescent follows a legible hanging arc with a trailing face", () => {
  const frames = model.loop.frames;
  const xs = frames.map((frame) => frame.x);
  const ys = frames.map((frame) => frame.y);
  const rotations = frames.map((frame) => frame.rotation);
  const scales = frames.map((frame) => frame.scale);
  assert.ok(Math.min(...xs) < -3 && Math.max(...xs) > 3);
  assert.ok(Math.min(...ys) < -1.5 && Math.max(...ys) < 0.13);
  assert.ok(Math.min(...rotations) > -12 && Math.max(...rotations) < 12);
  assert.ok(Math.min(...scales) >= 0.988 && Math.max(...scales) <= 1.012);
  const lateralPeak = frames.reduce(
    (best, frame, index) => (frame.x > frames[best].x ? index : best),
    0,
  );
  const tiltPeak = frames.reduce(
    (best, frame, index) =>
      frame.rotation > frames[best].rotation ? index : best,
    0,
  );
  assert.ok(tiltPeak > lateralPeak && tiltPeak - lateralPeak < 18);
});

test("capture fades in once, stays finite and shares an immutable sampled model", () => {
  const frames = model.entry.frames;
  assert.equal(frames[0].opacity, 0);
  assert.equal(frames.at(-1)!.opacity, 1);
  assert.ok(frames[0].scale < 0.25);
  assert.ok(
    frames.every(
      (frame, index) =>
        Object.values(frame).every(Number.isFinite) &&
        (index === 0 || frame.opacity >= frames[index - 1].opacity),
    ),
  );
  assert.equal(getEveningMoonMotion(), model);
  assert.ok(Object.isFrozen(model.entry.frames));
  assert.ok(Object.isFrozen(model.loop.frames));
});
