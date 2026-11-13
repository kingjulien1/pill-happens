import assert from "node:assert/strict";
import test from "node:test";
import {
  COFFEE_POT_CAVITY_POINTS,
  COFFEE_POT_SPOUT_POINT,
} from "./coffee-pot-icon";
import {
  COFFEE_INITIAL_FILL,
  COFFEE_POUR_ROTATION,
  COFFEE_STEAM_OPACITY,
  COFFEE_TIMING,
  coffeePolygonArea,
  getCoffeeSceneActiveDuration,
  getCoffeeSceneDuration,
  getCoffeeSceneFrame,
  solveCoffeeLiquid,
  transformCoffeePotPoint,
} from "./morning-coffee-motion";

const entryStart = COFFEE_TIMING.steamFadeMs + COFFEE_TIMING.gapMs;
const pourStart = entryStart + COFFEE_TIMING.entryMs;
const exitStart = pourStart + COFFEE_TIMING.pourMs;
const dwellStart = exitStart + COFFEE_TIMING.exitMs;
const close = (actual: number, expected: number, tolerance = 1e-8) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("gravity keeps the free surface horizontal through entry and the 65-degree pour", () => {
  for (const rotation of [0, -12, -38, COFFEE_POUR_ROTATION, 44, 90, 170]) {
    const liquid = solveCoffeeLiquid(0.61, rotation);
    const surface = liquid.points.filter(
      (point) =>
        Math.abs(
          point.x * liquid.freeSurface.normal.x +
            point.y * liquid.freeSurface.normal.y -
            liquid.freeSurface.level,
        ) < 1e-7,
    );
    assert.ok(
      surface.length >= 2,
      `Missing free surface at ${rotation} degrees`,
    );
    const angle = (rotation * Math.PI) / 180;
    const worldY = (point: { x: number; y: number }) =>
      point.x * Math.sin(angle) + point.y * Math.cos(angle);
    close(worldY(surface[0]), worldY(surface[surface.length - 1]));
  }
});

test("the curved cavity retains its liquid volume under rotation and sloshing", () => {
  const capacity = coffeePolygonArea(COFFEE_POT_CAVITY_POINTS);
  assert.ok(capacity > 100);
  for (const fraction of [0, 0.03, 0.25, COFFEE_INITIAL_FILL, 0.98, 1]) {
    for (const rotation of [-155, -65, -27, 0, 52, 90, 175]) {
      for (const sloshAngle of [-3, 0, 2.5]) {
        const liquid = solveCoffeeLiquid(fraction, rotation, { sloshAngle });
        close(liquid.area / capacity, fraction, 1e-9);
        close(coffeePolygonArea(liquid.points) / capacity, fraction, 1e-9);
        close(liquid.freeSurface.worldAngle, sloshAngle);
      }
    }
  }
});

test("sloshing tilts the world surface by its small specified angle", () => {
  const rotation = -65;
  const liquid = solveCoffeeLiquid(0.5, rotation, { sloshAngle: 2.5 });
  const { normal, level } = liquid.freeSurface;
  const surface = liquid.points.filter(
    (point) => Math.abs(point.x * normal.x + point.y * normal.y - level) < 1e-7,
  );
  const first = surface[0];
  const last = surface[surface.length - 1];
  const angle = (rotation * Math.PI) / 180;
  const dx =
    (last.x - first.x) * Math.cos(angle) - (last.y - first.y) * Math.sin(angle);
  const dy =
    (last.x - first.x) * Math.sin(angle) + (last.y - first.y) * Math.cos(angle);
  close(dy / dx, Math.tan((2.5 * Math.PI) / 180));
});

test("every pouring frame aligns the rotated spout exactly with the chosen mug target", () => {
  const target = { x: 73.25, y: 44.75 };
  for (const potScale of [0.7, 1.2, 1.55]) {
    for (const progress of [0, 0.2, 0.5, 0.99]) {
      const frame = getCoffeeSceneFrame(
        pourStart + COFFEE_TIMING.pourMs * progress,
        { mugTarget: target, potScale },
      );
      const spout = transformCoffeePotPoint(COFFEE_POT_SPOUT_POINT, frame.pot);
      assert.equal(frame.phase, "pour");
      assert.equal(Math.abs(frame.pot.rotation), 65);
      close(spout.x, target.x);
      close(spout.y, target.y);
      close(frame.stream.start.x, target.x);
      close(frame.stream.start.y, target.y);
    }
  }
});

test("a separate spout target leaves a vertical stream into the actual mug center", () => {
  const frame = getCoffeeSceneFrame(pourStart + 500, {
    mugTarget: { x: 64, y: 56 },
    pourTarget: { x: 64, y: 44 },
  });
  close(frame.stream.start.x, frame.stream.end.x);
  close(frame.stream.start.y, 44);
  close(frame.stream.end.y, 56);
  assert.ok(frame.stream.opacity > 0.99);
  assert.equal(frame.stream.progress, 1);
});

test("the exact lip alignment can pour four units into the mug", () => {
  const frame = getCoffeeSceneFrame(pourStart + 500, {
    mugTarget: { x: 25, y: 29 },
    streamTarget: { x: 25, y: 33 },
    potScale: 1.15,
  });
  close(frame.stream.start.x, 25);
  close(frame.stream.start.y, 29);
  close(frame.stream.end.x, 25);
  close(frame.stream.end.y, 33);
});

test("the pot grows and fades from the right while rising and starting its turn", () => {
  const start = getCoffeeSceneFrame(entryStart);
  const entering = getCoffeeSceneFrame(entryStart + 275);
  const arrived = getCoffeeSceneFrame(pourStart);
  assert.equal(start.pot.opacity, 0);
  assert.equal(start.pot.scale, 0.2);
  assert.ok(entering.pot.x < start.pot.x);
  assert.ok(entering.pot.y < start.pot.y);
  assert.ok(entering.pot.rotation < 0);
  assert.ok(entering.pot.scale > start.pot.scale);
  assert.ok(entering.pot.opacity > start.pot.opacity);
  assert.ok(start.pot.x > arrived.pot.x);
  const almost = getCoffeeSceneFrame(pourStart - 100);
  const before = getCoffeeSceneFrame(pourStart - 200);
  assert.ok(
    Math.abs(arrived.pot.x - almost.pot.x) <
      Math.abs(almost.pot.x - before.pot.x),
  );
});

test("the pour empties monotonically within two seconds and becomes linear halfway through", () => {
  assert.ok(COFFEE_TIMING.pourMs <= 2_000);
  let previous = COFFEE_INITIAL_FILL;
  for (let elapsed = 0; elapsed <= COFFEE_TIMING.pourMs; elapsed += 20) {
    const frame = getCoffeeSceneFrame(pourStart + elapsed);
    assert.ok(frame.fillFraction <= previous + 1e-10);
    assert.ok(frame.fillFraction >= 0);
    close(frame.mugFill + frame.fillFraction / COFFEE_INITIAL_FILL, 1);
    if (elapsed >= COFFEE_TIMING.pourMs / 2) {
      close(
        frame.fillFraction,
        COFFEE_INITIAL_FILL * (1 - elapsed / COFFEE_TIMING.pourMs),
      );
      close(frame.fluidSurface.worldAngle, 0);
    }
    previous = frame.fillFraction;
  }
  const end = getCoffeeSceneFrame(exitStart);
  assert.equal(end.fillFraction, 0);
  assert.equal(end.fluidPath, "");
  assert.equal(end.mugFill, 1);
  assert.equal(end.stream.opacity, 0);
});

test("steam fades for three seconds, leaves the pause, and returns to 0.75 with the pour", () => {
  assert.equal(COFFEE_TIMING.steamFadeMs, 3_000);
  assert.equal(COFFEE_TIMING.gapMs, 200);
  close(getCoffeeSceneFrame(0).steamOpacity, COFFEE_STEAM_OPACITY);
  close(getCoffeeSceneFrame(1_500).steamOpacity, COFFEE_STEAM_OPACITY / 2);
  close(getCoffeeSceneFrame(1_500).mugFill, 0.5);
  for (const elapsed of [3_000, 3_100, entryStart, pourStart]) {
    close(getCoffeeSceneFrame(elapsed).steamOpacity, 0);
  }
  close(
    getCoffeeSceneFrame(pourStart + 1_000).steamOpacity,
    COFFEE_STEAM_OPACITY / 2,
  );
  close(getCoffeeSceneFrame(exitStart).steamOpacity, COFFEE_STEAM_OPACITY);
});

test("phase boundaries preserve position, rotation, scale, volume, and steam", () => {
  for (const boundary of [
    3_000,
    entryStart,
    pourStart,
    exitStart,
    dwellStart,
  ]) {
    const before = getCoffeeSceneFrame(boundary - 0.001);
    const after = getCoffeeSceneFrame(boundary + 0.001);
    for (const key of ["x", "y", "rotation", "scale", "opacity"] as const) {
      close(before.pot[key], after.pot[key], 0.001);
    }
    close(before.fillFraction, after.fillFraction, 0.00001);
    close(before.mugFill, after.mugFill, 0.00001);
    close(before.steamOpacity, after.steamOpacity, 0.00001);
  }
});

test("the goofy exit accelerates left and up, reaching scale 0.2 and alpha 0.38 before hiding", () => {
  const start = getCoffeeSceneFrame(exitStart);
  const first = getCoffeeSceneFrame(exitStart + COFFEE_TIMING.exitMs / 3);
  const second = getCoffeeSceneFrame(
    exitStart + (2 * COFFEE_TIMING.exitMs) / 3,
  );
  const end = getCoffeeSceneFrame(dwellStart);
  assert.ok(start.pot.x > first.pot.x && first.pot.x > second.pot.x);
  assert.ok(end.pot.y < start.pot.y);
  assert.ok(
    Math.abs(end.pot.x - second.pot.x) > Math.abs(second.pot.x - first.pot.x),
  );
  close(end.pot.scale, 0.2);
  close(end.pot.opacity, 0.38);
  assert.equal(getCoffeeSceneFrame(dwellStart - 0.001).pot.visible, true);
  assert.equal(end.pot.visible, false);
});

test("dwell accepts only six to twelve seconds and frames remain finite at every stage", () => {
  assert.equal(getCoffeeSceneActiveDuration(), 7_350);
  assert.equal(getCoffeeSceneDuration(6_000), dwellStart + 6_000);
  assert.equal(getCoffeeSceneDuration(12_000), dwellStart + 12_000);
  assert.equal(getCoffeeSceneDuration(0), dwellStart + 6_000);
  assert.equal(getCoffeeSceneDuration(99_000), dwellStart + 12_000);
  const samples = [
    -100,
    NaN,
    Infinity,
    0,
    3_100,
    entryStart + 400,
    pourStart + 900,
    exitStart + 650,
    99_999,
  ];
  for (const elapsed of samples) {
    const frame = getCoffeeSceneFrame(elapsed);
    for (const value of [
      frame.fillFraction,
      frame.mugFill,
      frame.steamOpacity,
      frame.fluidSurface.level,
      ...frame.pot.matrix,
    ]) {
      assert.ok(Number.isFinite(value));
    }
    assert.doesNotMatch(frame.fluidPath + frame.pot.transform, /NaN|Infinity/);
  }
});

test("the departure can finish outside the viewport without fading away early", () => {
  const frame = getCoffeeSceneFrame(dwellStart, {
    exitTarget: { x: -350, y: -40 },
  });
  close(frame.pot.x, -350);
  close(frame.pot.y, -40);
  close(frame.pot.opacity, 0.38);
  close(frame.pot.scale, 0.2);
});
