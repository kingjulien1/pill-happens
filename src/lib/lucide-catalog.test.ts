import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getLucideIconLabel,
  isLucideIconName,
  LUCIDE_ICON_CATALOG,
  searchLucideIcons,
} from "./lucide-catalog";
import { LUCIDE_ICON_NAMES } from "./lucide-icon-names";
import { isMedicationIcon } from "./medication-appearance";

test("the searchable allowlist matches the installed canonical Lucide import targets", () => {
  const imports = readFileSync(
    new URL(
      "../../node_modules/lucide-react/dist/esm/dynamicIconImports.js",
      import.meta.url,
    ),
    "utf8",
  );
  const installed = [
    ...imports.matchAll(
      /"([a-z0-9-]+)": \(\) => import\('\.\/icons\/([a-z0-9-]+)\.js'\)/g,
    ),
  ]
    .filter(([, name, target]) => name === target)
    .map(([, name]) => name);
  assert.deepEqual(LUCIDE_ICON_NAMES, installed);
  assert.equal(LUCIDE_ICON_CATALOG.length, installed.length);
  for (const entry of LUCIDE_ICON_CATALOG) {
    assert.equal(isMedicationIcon(entry.value), true, entry.value);
    assert.equal(isLucideIconName(entry.value), true, entry.value);
    assert.ok(entry.label.length > 0, entry.value);
    assert.ok(Array.isArray(entry.keywords), entry.value);
  }
});

test("Lucide discovery supports exact names, separate query terms, and package aliases", () => {
  assert.equal(searchLucideIcons("heart")[0].value, "heart");
  assert.equal(searchLucideIcons("HEART PULSE")[0].value, "heart-pulse");
  assert.ok(
    searchLucideIcons("alarm check").some(
      ({ value }) => value === "alarm-clock-check",
    ),
  );
  assert.equal(searchLucideIcons("squirrel")[0].value, "squirrel");
  assert.equal(searchLucideIcons("flask-conical")[0].value, "flask-conical");
});

test("English and German category keywords find relevant icons without a remote API", () => {
  for (const [query, expected] of [
    ["pflanzen", "leaf"],
    ["blumen", "flower-2"],
    ["bäume", "tree-pine"],
    ["kaffee", "coffee"],
    ["gesundheit", "pill"],
    ["katze", "cat"],
    ["musik", "guitar"],
    ["fahrrad", "bike"],
    ["getränke", "coffee"],
    ["füße", "footprints"],
    ["fusse", "footprints"],
  ]) {
    assert.ok(
      searchLucideIcons(query).some(({ value }) => value === expected),
      `${query}: ${expected}`,
    );
  }
});

test("search limits, initial state, and no-match state are predictable", () => {
  assert.deepEqual(searchLucideIcons(""), []);
  assert.deepEqual(searchLucideIcons("   "), []);
  assert.deepEqual(searchLucideIcons("💊"), []);
  assert.deepEqual(searchLucideIcons("zzzznoiconmatcheszzzz"), []);
  assert.deepEqual(searchLucideIcons("heart", 0), []);
  assert.deepEqual(searchLucideIcons("heart", NaN), []);
  assert.deepEqual(searchLucideIcons("heart", 0.5), []);
  assert.equal(searchLucideIcons("heart", 3).length, 3);
  assert.ok(searchLucideIcons("symbol", Infinity).length > 96);
  assert.equal(
    new Set(searchLucideIcons("nature").map(({ value }) => value)).size,
    searchLucideIcons("nature").length,
  );
});

test("labels preserve the legacy capsule drawing name without accepting arbitrary text", () => {
  assert.equal(getLucideIconLabel("capsule"), "Capsule");
  assert.equal(getLucideIconLabel("flower-2"), "Flower 2");
  assert.equal(getLucideIconLabel("not-an-installed-icon"), undefined);
  assert.equal(getLucideIconLabel("<svg>"), undefined);
  assert.equal(getLucideIconLabel("💊"), undefined);
});
