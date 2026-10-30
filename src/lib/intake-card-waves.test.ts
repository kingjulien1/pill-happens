import assert from "node:assert/strict";
import test from "node:test";
import { getIntakeCardWaves } from "./intake-card-waves";

type Point = { x: number; y: number };
type Segment = { start: Point; first: Point; second: Point; end: Point };

function parseWave(path: string): Segment[] {
  assert.match(path, /^M -?\d+ -?\d+(?: C(?: -?\d+){6})+$/);
  const numbers = path.match(/-?\d+/g)!.map(Number);
  let start = { x: numbers[0], y: numbers[1] };
  const segments: Segment[] = [];
  for (let index = 2; index < numbers.length; index += 6) {
    const end = { x: numbers[index + 4], y: numbers[index + 5] };
    segments.push({
      start,
      first: { x: numbers[index], y: numbers[index + 1] },
      second: { x: numbers[index + 2], y: numbers[index + 3] },
      end,
    });
    start = end;
  }
  return segments;
}

function cubic(segment: Segment, progress: number): Point {
  const remaining = 1 - progress;
  const weights = [
    remaining ** 3,
    3 * remaining ** 2 * progress,
    3 * remaining * progress ** 2,
    progress ** 3,
  ];
  const points = [segment.start, segment.first, segment.second, segment.end];
  return {
    x: points.reduce((sum, point, index) => sum + point.x * weights[index], 0),
    y: points.reduce((sum, point, index) => sum + point.y * weights[index], 0),
  };
}

function heightAt(segments: Segment[], x: number): number {
  const segment = segments.find((item) => item.end.x >= x)!;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    if (cubic(segment, middle).x < x) low = middle;
    else high = middle;
  }
  return cubic(segment, (low + high) / 2).y;
}

const ids = [
  "",
  "💊",
  "<svg onload='synthetic()'>",
  ...Array.from(
    { length: 400 },
    (_, index) => `synthetic-intake-wave-${index}`,
  ),
];

test("intake waves stay deterministic and return independent containers", () => {
  const first = getIntakeCardWaves("synthetic-one");
  const snapshot = { ...first };
  getIntakeCardWaves("unrelated-call");
  const again = getIntakeCardWaves("synthetic-one");
  assert.deepEqual(again, snapshot);
  assert.ok(again.phaseSeconds >= -20 && again.phaseSeconds <= 0);
  assert.notEqual(again, first);
  first.curveA = "changed only in the returned container";
  assert.deepEqual(getIntakeCardWaves("synthetic-one"), snapshot);
});

test("safe, broad intake waves advance across the full card without loops or tight curls", () => {
  for (const id of ids) {
    const waves = getIntakeCardWaves(id);
    for (const path of [waves.curveA, waves.curveB]) {
      const segments = parseWave(path);
      assert.ok(segments[0].start.x < 0);
      assert.ok(segments.at(-1)!.end.x > 360);
      const rises: number[] = [];
      for (const segment of segments) {
        assert.ok(segment.end.x - segment.start.x >= 80);
        assert.ok(segment.start.x < segment.first.x);
        assert.ok(segment.first.x < segment.second.x);
        assert.ok(segment.second.x < segment.end.x);
        for (const point of [
          segment.start,
          segment.first,
          segment.second,
          segment.end,
        ]) {
          assert.ok(point.x >= -30 && point.x <= 400);
          assert.ok(point.y >= 8 && point.y <= 140);
        }
        const rise = segment.end.y - segment.start.y;
        assert.ok(
          Math.abs(rise) >= 12,
          "each broad span visibly rises or falls",
        );
        rises.push(Math.sign(rise));
      }
      assert.deepEqual(rises, [-1, 1, -1]);
    }
  }
});

test("crest and trough joins share continuous horizontal tangents", () => {
  for (const id of ids) {
    const waves = getIntakeCardWaves(id);
    for (const path of [waves.curveA, waves.curveB]) {
      const segments = parseWave(path);
      for (let index = 1; index < segments.length; index += 1) {
        const before = segments[index - 1];
        const after = segments[index];
        assert.deepEqual(before.end, after.start);
        const incoming = {
          x: 3 * (before.end.x - before.second.x),
          y: 3 * (before.end.y - before.second.y),
        };
        const outgoing = {
          x: 3 * (after.first.x - after.start.x),
          y: 3 * (after.first.y - after.start.y),
        };
        assert.ok(incoming.x > 0);
        assert.equal(incoming.y, 0);
        assert.deepEqual(incoming, outgoing);
      }
    }
  }
});

test("paired waves keep clear space while varying their heights and horizontal spans", () => {
  const shapes = new Set<string>();
  const amplitudes = new Set<number>();
  const crestPositions = new Set<number>();
  for (const id of ids) {
    const waves = getIntakeCardWaves(id);
    const upper = parseWave(waves.curveA);
    const lower = parseWave(waves.curveB);
    assert.notEqual(waves.curveA, waves.curveB);
    for (let x = 0; x <= 360; x += 6) {
      const gap = heightAt(lower, x) - heightAt(upper, x);
      assert.ok(
        gap >= 24 && gap <= 44,
        "wave strokes remain visibly separated",
      );
    }
    shapes.add(waves.curveA + waves.curveB);
    amplitudes.add(upper[1].end.y - upper[0].end.y);
    crestPositions.add(upper[0].end.x);
  }
  assert.equal(shapes.size, ids.length);
  assert.ok(amplitudes.size > 20);
  assert.ok(crestPositions.size > 20);
});
