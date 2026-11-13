import assert from "node:assert/strict";
import test from "node:test";
import {
  LOADING_SCREEN_COPY,
  LOADING_SCREEN_LINKS,
  selectLoadingScreenLinks,
} from "./loading-screen-content";

const ids = (pathname: string, referrer?: string | null, random = () => 0) =>
  selectLoadingScreenLinks(pathname, referrer, random).map(({ id }) => id);

test("the pool contains unique, local destinations supported by the journal", () => {
  assert.deepEqual(
    LOADING_SCREEN_LINKS.map(({ href }) => href),
    [
      "/",
      "/journal",
      "/history",
      "/medications",
      "/goals",
      "/streaks",
      "/guide#start",
      "/developer-guide",
    ],
  );
  assert.equal(new Set(LOADING_SCREEN_LINKS.map(({ id }) => id)).size, 8);
  assert.ok(LOADING_SCREEN_LINKS.every(({ label }) => label.length > 0));
});

test("every current route and nested route is excluded across random selections", () => {
  for (const link of LOADING_SCREEN_LINKS) {
    const pathname = link.href.split("#")[0];
    const paths = [pathname, `${pathname}?view=all#top`, `${pathname}/`];
    if (pathname !== "/") paths.push(`${pathname}/example/nested`);
    for (const path of paths) {
      for (let seed = 0; seed < 31; seed += 1) {
        assert.ok(!ids(path, null, () => seed / 31).includes(link.id), path);
      }
    }
  }
});

test("a same-origin caller family and the current family are both excluded", () => {
  for (let seed = 0; seed < 31; seed += 1) {
    const pair = ids(
      "/medications/example/?edit=true#appearance",
      "/history/2026-11-13/?view=all#entries",
      () => seed / 31,
    );
    assert.ok(!pair.includes("medications"));
    assert.ok(!pair.includes("history"));
    assert.equal(pair.length, 2);
    assert.equal(new Set(pair).size, 2);
  }
});

test("unknown paths do not hide Today or a similarly prefixed destination", () => {
  assert.deepEqual(ids("/guidebook", null), ["today", "journal"]);
  assert.deepEqual(ids("/journalist", null), ["today", "journal"]);
  assert.deepEqual(ids("/unlisted", null), ["today", "journal"]);
});

test("a caller on the same route still returns two distinct alternatives", () => {
  assert.deepEqual(ids("/", "/?from=refresh"), ["journal", "history"]);
  assert.deepEqual(ids("/journal/page", "/journal/other"), [
    "today",
    "history",
  ]);
  assert.deepEqual(
    ids("/guide/", "/guide#start", () => 0.999),
    ["developer-guide", "streaks"],
  );
});

test("fresh random samples change the pair without mutating the shared pool", () => {
  const original = JSON.stringify(LOADING_SCREEN_LINKS);
  const pairs = new Set<string>();
  for (let sample = 0; sample < 32; sample += 1) {
    let draws = 0;
    const pair = selectLoadingScreenLinks("/", null, () => {
      draws += 1;
      return draws === 1 ? sample / 32 : ((sample * 7) % 32) / 32;
    });
    assert.equal(draws, 2);
    assert.equal(new Set(pair.map(({ id }) => id)).size, 2);
    pairs.add(pair.map(({ id }) => id).join(","));
  }
  assert.ok(pairs.size >= 12);
  assert.equal(JSON.stringify(LOADING_SCREEN_LINKS), original);
});

test("out-of-range cosmetic random sources still return valid distinct links", () => {
  for (const value of [-1, 1, 20, Number.NaN, Number.POSITIVE_INFINITY]) {
    const pair = selectLoadingScreenLinks("/", null, () => value);
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0].id, pair[1].id);
    assert.ok(pair.every((link) => LOADING_SCREEN_LINKS.includes(link)));
    assert.ok(pair.every(({ id }) => id !== "today"));
  }
});

test("copy keeps the short trailing ellipsis and two quiet lines per section", () => {
  assert.ok(LOADING_SCREEN_COPY.title.endsWith("..."));
  assert.equal(LOADING_SCREEN_COPY.secondary.length, 2);
  assert.equal(LOADING_SCREEN_COPY.footer.length, 2);
});
