import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_REFRESH_MARKER_TTL,
  BRAND_REFRESH_THRESHOLD,
  brandPullOffset,
  isBrandRefreshPull,
  isRecentBrandRefresh,
} from "./brand-refresh";

test("a refresh requires reaching the downward threshold", () => {
  for (const distance of [-200, -1, 0, 8, BRAND_REFRESH_THRESHOLD - 0.01]) {
    assert.equal(isBrandRefreshPull(0, distance), false);
  }
  assert.equal(isBrandRefreshPull(0, BRAND_REFRESH_THRESHOLD), true);
  assert.equal(isBrandRefreshPull(0, BRAND_REFRESH_THRESHOLD + 40), true);
});

test("horizontal and diagonal gestures cannot arm a refresh", () => {
  for (const direction of [-1, 1]) {
    assert.equal(isBrandRefreshPull(direction * 120, 0), false);
    assert.equal(isBrandRefreshPull(direction * 80, 120), false);
    assert.equal(isBrandRefreshPull(direction * 81, 120), false);
    assert.equal(isBrandRefreshPull(direction * 79, 120), true);
  }
});

test("pull resistance grows continuously without moving the handle out of its header gap", () => {
  assert.equal(brandPullOffset(-100), 0);
  assert.equal(brandPullOffset(0), 0);
  let previous = 0;
  for (const distance of [1, 8, 30, BRAND_REFRESH_THRESHOLD, 200, 400, 1_000]) {
    const offset = brandPullOffset(distance);
    assert.ok(offset > previous);
    assert.ok(offset < distance);
    assert.ok(offset < 84);
    previous = offset;
  }
  assert.ok(
    brandPullOffset(BRAND_REFRESH_THRESHOLD + 0.01) -
      brandPullOffset(BRAND_REFRESH_THRESHOLD) <
      0.01,
    "crossing the release threshold must not jump the handle",
  );
});

test("reload hand-off accepts only a recent marker for the exact current route", () => {
  const now = 1_000_000;
  const marker = JSON.stringify({ at: now - 450, path: "/history?view=all" });
  assert.equal(isRecentBrandRefresh(marker, "/history?view=all", now), true);
  for (const route of ["/", "/history", "/history?view=active"]) {
    assert.equal(isRecentBrandRefresh(marker, route, now), false);
  }
});

test("reload markers expire at the TTL and reject future timestamps", () => {
  const now = 1_000_000;
  const recent = (at: number) =>
    isRecentBrandRefresh(JSON.stringify({ at, path: "/" }), "/", now);
  assert.equal(recent(now), true);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL + 1), true);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL), false);
  assert.equal(recent(now - BRAND_REFRESH_MARKER_TTL - 1), false);
  assert.equal(recent(now + 1), false);
});

test("malformed or mistyped hand-off data cannot cover an unrelated page with a loader", () => {
  const now = 1_000_000;
  for (const marker of [
    null,
    "",
    "not JSON",
    "null",
    "[]",
    "123",
    '"refresh"',
    "{}",
    JSON.stringify({ at: String(now), path: "/" }),
    JSON.stringify({ at: null, path: "/" }),
    JSON.stringify({ at: now, path: ["/"] }),
    JSON.stringify({ at: now }),
    '{"at":1e999,"path":"/"}',
  ]) {
    assert.equal(
      isRecentBrandRefresh(marker, "/", now),
      false,
      marker ?? "null",
    );
  }
});
