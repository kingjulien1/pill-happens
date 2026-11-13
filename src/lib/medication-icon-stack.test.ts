import assert from "node:assert/strict";
import test from "node:test";
import {
  getMedicationIconStack,
  MEDICATION_ICON_STACK,
} from "./medication-icon-stack";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("positive quantities round upward without hiding any ordinary unit", () => {
  for (const [quantity, count] of [
    [0.01, 1],
    [0.5, 1],
    [1, 1],
    [1.01, 2],
    [2.5, 3],
    [9.01, 10],
    [10, 10],
  ]) {
    const fan = getMedicationIconStack(quantity);
    assert.equal(fan.count, count);
    assert.equal(fan.layers.length, count);
  }
});

test("each smaller right-hand layer exposes a fifth and shares one vertical center", () => {
  const { layers, width } = getMedicationIconStack(10);
  near(layers[0].left, 0);
  near(layers[0].size, 48);
  near(layers[0].opacity, 1);

  for (const layer of layers) {
    near(layer.top + layer.size / 2, 24);
    near(layer.scale, 0.92 ** layer.index);
    near(layer.opacity, 0.83 ** layer.index);
    if (layer.index === 0) continue;
    const previous = layers[layer.index - 1];
    near(layer.size, previous.size * 0.92);
    near(layer.opacity, previous.opacity * 0.83);
    const exposed = layer.left + layer.size - (previous.left + previous.size);
    near(exposed / layer.size, 0.2);
    assert.ok(layer.left > previous.left);
  }
  near(width, layers.at(-1)!.left + layers.at(-1)!.size);
});

test("every quantity fits the same centered 56px rail without shifting card copy", () => {
  for (let count = 1; count <= MEDICATION_ICON_STACK.maxLayers; count++) {
    const fan = getMedicationIconStack(count);
    const { rail } = fan;
    assert.equal(rail.width, 56);
    assert.equal(rail.width, MEDICATION_ICON_STACK.rail);
    assert.ok(rail.scale > 0 && rail.scale <= 1);
    const renderedWidth = fan.width * rail.scale;
    near((rail.width - renderedWidth) / 2, 4);
    assert.ok(MEDICATION_ICON_STACK.size * rail.scale <= 48);
    for (const layer of fan.layers) {
      assert.ok(4 + layer.left * rail.scale >= 4);
      assert.ok(4 + (layer.left + layer.size) * rail.scale <= 52 + 1e-9);
    }
  }
  assert.equal(getMedicationIconStack(1).rail.scale, 1);
  assert.equal(getMedicationIconStack(1).layers[0].size, 48);
  assert.ok(getMedicationIconStack(2).rail.scale < 1);
});

test("huge quantities have bounded decoration while keeping their full count", () => {
  for (const quantity of [100, 1_000_000, Number.MAX_VALUE]) {
    const fan = getMedicationIconStack(quantity);
    assert.equal(fan.count, quantity);
    assert.equal(fan.layers.length, MEDICATION_ICON_STACK.maxLayers);
    assert.ok(fan.layers.at(-1)!.opacity < 0.02);
    for (const layer of fan.layers)
      for (const value of Object.values(layer))
        assert.ok(Number.isFinite(value));
  }
});

test("missing or invalid draft values keep one safe stable artwork frame", () => {
  for (const quantity of [
    undefined,
    0,
    -0.5,
    Number.NaN,
    Infinity,
    -Infinity,
  ]) {
    const fan = getMedicationIconStack(quantity);
    assert.equal(fan.count, 1);
    assert.equal(fan.layers.length, 1);
    assert.equal(fan.rail.width, 56);
    assert.equal(fan.width, 48);
  }
  const fan = getMedicationIconStack(2);
  fan.layers[0].left = 999;
  assert.equal(getMedicationIconStack(2).layers[0].left, 0);
});
