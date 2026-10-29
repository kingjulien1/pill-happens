import assert from "node:assert/strict";
import test from "node:test";
import {
  getBackgroundFrameElapsed,
  getBackgroundResolution,
} from "./background-rendering";

test("the shader clock covers the same real time at 10, 30, 60, and 120fps", () => {
  for (const fps of [10, 30, 60, 120]) {
    let elapsed = 0;
    let previous = 0;
    for (let frame = 1; frame <= fps * 6; frame += 1) {
      const now = (frame * 1_000) / fps;
      elapsed += getBackgroundFrameElapsed(now, previous);
      previous = now;
    }
    assert.ok(Math.abs(elapsed - 6) < 1e-10, `${fps}fps: ${elapsed}s`);
  }
});

test("50ms and slower frames keep their elapsed shader time", () => {
  assert.equal(getBackgroundFrameElapsed(1_050, 1_000), 0.05);
  assert.equal(getBackgroundFrameElapsed(1_100, 1_000), 0.1);
  assert.equal(getBackgroundFrameElapsed(1_200, 1_000), 0.2);
  assert.equal(getBackgroundFrameElapsed(1_000 / 120, 0), 1 / 120);
  assert.equal(getBackgroundFrameElapsed(0, 0), 0);
});

test("starting or resuming the shader cannot consume time spent hidden", () => {
  assert.equal(getBackgroundFrameElapsed(0, null), 1 / 60);
  assert.equal(getBackgroundFrameElapsed(3_600_000, null), 1 / 60);
  assert.equal(getBackgroundFrameElapsed(3_600_100, 3_600_000), 0.1);
});

test("long stalls are bounded and invalid or reversed clocks do not advance", () => {
  assert.equal(getBackgroundFrameElapsed(1_000, 0), 0.25);
  assert.equal(getBackgroundFrameElapsed(3_600_000, 100), 0.25);
  for (const [now, previous] of [
    [NaN, null],
    [Infinity, null],
    [-1, null],
    [100, NaN],
    [100, Infinity],
    [100, -1],
    [99, 100],
  ] as const) {
    assert.equal(getBackgroundFrameElapsed(now, previous), 0);
  }
});

test("default desktop resolutions retain the existing rounded DPR2 allocation", () => {
  assert.deepEqual(
    getBackgroundResolution({ width: 1_920, height: 1_080, dpr: 1 }),
    { width: 1_920, height: 1_080, ratio: 1 },
  );
  assert.deepEqual(
    getBackgroundResolution({ width: 3_440, height: 1_440, dpr: 3 }),
    { width: 6_880, height: 2_880, ratio: 2 },
  );
  assert.deepEqual(
    getBackgroundResolution({ width: 1_280.4, height: 720.2, dpr: 1.5 }),
    { width: 1_921, height: 1_080, ratio: 1.5 },
  );
});

test("a density cap reduces high DPR without increasing lower native densities", () => {
  assert.deepEqual(
    getBackgroundResolution({
      width: 390,
      height: 844,
      dpr: 3,
      maxDpr: 1.25,
    }),
    { width: 488, height: 1_055, ratio: 1.25 },
  );
  assert.deepEqual(
    getBackgroundResolution({ width: 390, height: 844, dpr: 1, maxDpr: 1.25 }),
    { width: 390, height: 844, ratio: 1 },
  );
  assert.deepEqual(
    getBackgroundResolution({
      width: 800,
      height: 600,
      dpr: 0.5,
      maxDpr: 1.25,
    }),
    { width: 400, height: 300, ratio: 0.5 },
  );
});

test("phone and tablet pixel budgets constrain the actual allocated integers", () => {
  assert.deepEqual(
    getBackgroundResolution({
      width: 390,
      height: 844,
      dpr: 3,
      maxDpr: 1.25,
      maxPixels: 750_000,
    }),
    { width: 487, height: 1_055, ratio: 1.25 },
  );
  assert.deepEqual(
    getBackgroundResolution({
      width: 768,
      height: 1_024,
      dpr: 2,
      maxDpr: 1.25,
      maxPixels: 750_000,
    }),
    { width: 750, height: 1_000, ratio: 0.9765625 },
  );

  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [844, 390],
    [768, 1_024],
    [1_024, 1_366],
    [1_366, 1_024],
  ]) {
    for (const dpr of [0.75, 1, 1.25, 2, 3]) {
      const resolution = getBackgroundResolution({
        width,
        height,
        dpr,
        maxDpr: 1.25,
        maxPixels: 750_000,
      });
      assert.ok(resolution.width * resolution.height <= 750_000);
      assert.ok(resolution.ratio <= Math.min(dpr, 1.25));
      assert.ok(Number.isInteger(resolution.width) && resolution.width >= 1);
      assert.ok(Number.isInteger(resolution.height) && resolution.height >= 1);
      assert.ok(Math.abs(resolution.width - width * resolution.ratio) < 1);
      assert.ok(Math.abs(resolution.height - height * resolution.ratio) < 1);
    }
  }
});

test("minimum one-pixel axes cannot violate a budget on very thin viewports", () => {
  for (const [width, height] of [
    [1, 1_000_000],
    [1_000_000, 1],
  ]) {
    const resolution = getBackgroundResolution({
      width,
      height,
      dpr: 2,
      maxPixels: 100,
    });
    assert.equal(resolution.width * resolution.height, 100);
    assert.equal(resolution.ratio, 0.0001);
  }
  assert.deepEqual(
    getBackgroundResolution({ width: 390, height: 844, dpr: 2, maxPixels: 1 }),
    { width: 1, height: 1, ratio: 1 / 844 },
  );
});

test("invalid dimensions and density values produce finite positive allocations", () => {
  for (const invalid of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.deepEqual(
      getBackgroundResolution({
        width: invalid,
        height: invalid,
        dpr: invalid,
      }),
      { width: 1, height: 1, ratio: 1 },
    );
    assert.deepEqual(
      getBackgroundResolution({
        width: 1_280.4,
        height: 720.2,
        dpr: 3,
        maxDpr: invalid,
        maxPixels: invalid,
      }),
      { width: 2_561, height: 1_440, ratio: 2 },
    );
  }
  assert.deepEqual(
    getBackgroundResolution({
      width: 10,
      height: 10,
      dpr: 1,
      maxPixels: 0.5,
    }),
    { width: 1, height: 1, ratio: 0.1 },
  );
});
