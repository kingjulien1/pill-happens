import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSleepPill,
  createSleepPill,
  sleepPillAppearance,
  SLEEP_PILL_LIFETIME,
} from "./sleep-score-particles";

const make = () => createSleepPill({ x: 100, y: 100, angle: 0 }, () => 0.5);

test("pills reveal from zero, shrink through flight and expire after five seconds", () => {
  const pill = make();
  assert.equal(sleepPillAppearance(pill).opacity, 0);
  assert.equal(sleepPillAppearance(pill).scale, 0);
  pill.age = 900;
  const young = sleepPillAppearance(pill);
  pill.age = 4_000;
  const old = sleepPillAppearance(pill);
  assert.equal(young.opacity, 1);
  assert.ok(old.scale < young.scale);
  pill.age = SLEEP_PILL_LIFETIME - 1;
  assert.equal(
    advanceSleepPill(pill, 1, { width: 390, height: 844 }).expired,
    true,
  );
});

test("each screen edge reflects the pill inward and reports a wall impact", () => {
  for (const [x, y, vx, vy] of [
    [12, 100, -160, 20],
    [378, 100, 160, 20],
    [100, 12, 20, -160],
    [100, 832, 20, 160],
  ]) {
    const pill = { ...make(), x, y, vx, vy };
    const result = advanceSleepPill(pill, 33, { width: 390, height: 844 });
    assert.equal(result.hit, true);
    assert.ok(pill.x >= pill.size / 2 + 3 && pill.x <= 390 - pill.size / 2 - 3);
    assert.ok(pill.y >= pill.size / 2 + 3 && pill.y <= 844 - pill.size / 2 - 3);
    if (vx < 0) assert.ok(pill.vx > 0);
    if (vx > 100) assert.ok(pill.vx < 0);
    if (vy < 0) assert.ok(pill.vy > 0);
    if (vy > 100) assert.ok(pill.vy < 0);
  }
});

test("slow frames preserve the lifetime without teleporting particles", () => {
  const pill = make();
  advanceSleepPill(pill, 1_500, { width: 1200, height: 900 });
  assert.equal(pill.age, 1_500);
  assert.ok(pill.x - 100 <= 190 * 0.08);
  assert.ok(Number.isFinite(pill.rotation));
});
