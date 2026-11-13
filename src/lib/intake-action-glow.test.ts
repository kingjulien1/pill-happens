import assert from "node:assert/strict";
import test from "node:test";
import {
  getIntakeGlowCanvasBounds,
  getIntakeGlowMotion,
  getIntakeGlowOpacity,
  getIntakeGlowPerimeterPoint,
  INTAKE_GLOW_PADDING,
  INTAKE_GLOW_RADIUS,
} from "./intake-action-glow";

test("the continuous halo fades monotonically to zero before the transparent gutter", () => {
  let previous = getIntakeGlowOpacity(0);
  assert.ok(previous > 0 && previous < 1);
  for (let distance = 0.25; distance <= INTAKE_GLOW_RADIUS; distance += 0.25) {
    const opacity = getIntakeGlowOpacity(distance);
    assert.ok(opacity >= 0 && opacity < previous);
    previous = opacity;
  }
  assert.equal(getIntakeGlowOpacity(INTAKE_GLOW_RADIUS), 0);
  assert.equal(getIntakeGlowOpacity(INTAKE_GLOW_PADDING), 0);
  assert.equal(getIntakeGlowOpacity(Infinity), 0);
  assert.equal(getIntakeGlowOpacity(NaN), 0);
});

test("halo movement remains continuous, subtle and finite without point lights", () => {
  let previous = getIntakeGlowMotion(0);
  for (let frame = 1; frame <= 1800; frame += 1) {
    const current = getIntakeGlowMotion(frame / 60);
    assert.ok(current.opacity >= 0.88 - 1e-9 && current.opacity <= 1 + 1e-9);
    assert.ok(Math.abs(current.opacity - previous.opacity) < 0.001);
    assert.ok(current.angle > previous.angle);
    assert.ok(current.angle - previous.angle < 0.005);
    previous = current;
  }
  assert.deepEqual(getIntakeGlowMotion(NaN), getIntakeGlowMotion(0));
});

test("every finite glow has an eight-pixel clear gutter inside the viewport", () => {
  const button = { left: 300.375, top: 400.125, width: 445.625, height: 64 };
  const bounds = getIntakeGlowCanvasBounds(button, {
    left: 0,
    top: 0,
    width: 1440,
    height: 1000,
  });
  assert.ok(bounds);
  for (let index = 0; index < 200; index += 1) {
    const [x, y] = getIntakeGlowPerimeterPoint(
      button.width,
      button.height,
      22,
      index / 200,
    );
    assert.ok(
      button.left + x - INTAKE_GLOW_RADIUS >= bounds.left + 8 - 0.000001,
    );
    assert.ok(button.top + y - INTAKE_GLOW_RADIUS >= bounds.top + 8 - 0.000001);
    assert.ok(
      button.left + x + INTAKE_GLOW_RADIUS <=
        bounds.left + bounds.width - 8 + 0.000001,
    );
    assert.ok(
      button.top + y + INTAKE_GLOW_RADIUS <=
        bounds.top + bounds.height - 8 + 0.000001,
    );
  }
  assert.equal(INTAKE_GLOW_PADDING - INTAKE_GLOW_RADIUS, 8);
});

test("mobile and visual viewport bounds crop only at the viewport edges", () => {
  const viewport = { left: 7, top: 32, width: 320, height: 600 };
  const button = { left: 24, top: 570, width: 272, height: 64 };
  const bounds = getIntakeGlowCanvasBounds(button, viewport);
  assert.deepEqual(bounds, { left: 7, top: 506, width: 320, height: 126 });
  assert.equal(
    getIntakeGlowCanvasBounds({ ...button, top: -200 }, viewport),
    null,
  );
  assert.equal(
    getIntakeGlowCanvasBounds({ ...button, width: 0 }, viewport),
    null,
  );
});

test("perimeter travel stays on the rounded edge through corners and wraparound", () => {
  for (const [width, height, radius] of [
    [446, 64, 22],
    [271.625, 64, 22],
    [52, 52, 26],
    [400, 52, 0],
  ]) {
    for (let index = 0; index < 200; index += 1) {
      const [x, y] = getIntakeGlowPerimeterPoint(
        width,
        height,
        radius,
        index / 200,
      );
      const qx = Math.abs(x - width / 2) - width / 2 + radius;
      const qy = Math.abs(y - height / 2) - height / 2 + radius;
      const edgeDistance =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        radius;
      assert.ok(Math.abs(edgeDistance) < 0.000001);
    }
    assert.deepEqual(
      getIntakeGlowPerimeterPoint(width, height, radius, 0),
      getIntakeGlowPerimeterPoint(width, height, radius, 1),
    );
    assert.deepEqual(
      getIntakeGlowPerimeterPoint(width, height, radius, 0.75),
      getIntakeGlowPerimeterPoint(width, height, radius, -0.25),
    );
  }
});
