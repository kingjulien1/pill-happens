import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  getSvgIcon,
  isMedicationSvgIcon,
  searchSvgIcons,
  SVG_ICON_CATALOG,
} from "./svg-icon-catalog";

test("the local SVG catalog has unique stable IDs and corresponding checked-in assets", () => {
  assert.ok(SVG_ICON_CATALOG.length > 0);
  assert.equal(
    new Set(SVG_ICON_CATALOG.map(({ value }) => value)).size,
    SVG_ICON_CATALOG.length,
  );
  assert.equal(
    new Set(SVG_ICON_CATALOG.map(({ src }) => src)).size,
    SVG_ICON_CATALOG.length,
  );
  const directory = new URL("../../public/icons/medications/", import.meta.url);
  assert.deepEqual(
    readdirSync(directory).sort(),
    SVG_ICON_CATALOG.map(({ src }) => src.split("/").at(-1)).sort(),
  );
  for (const entry of SVG_ICON_CATALOG) {
    assert.match(entry.value, /^svg:[a-z]+(?:-[a-z]+)*$/);
    assert.ok(entry.value.length <= 64);
    assert.equal(entry.src, `/icons/medications/${entry.value.slice(4)}.svg`);
    assert.ok(entry.label.length > 0);
    assert.equal(isMedicationSvgIcon(entry.value), true);
    assert.equal(getSvgIcon(entry.value), entry);
    const svg = readFileSync(
      new URL(entry.src.slice(1), new URL("../../public/", import.meta.url)),
      "utf8",
    );
    assert.match(svg, /^<svg\s/);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke-width="2\.5"/);
    assert.match(svg, /<\/(?:svg)>\s*$/);
    assert.doesNotMatch(
      svg,
      /<(?:script|foreignObject|image|iframe|style)\b|\bon[a-z]+\s*=|\b(?:href|src)\s*=|url\s*\(/i,
    );
  }
});

test("SVG values are a strict allowlist rather than arbitrary file paths or markup", () => {
  for (const value of [
    "",
    "svg:unknown",
    "svg:../pill-spark",
    "SVG:pill-spark",
    "pill-spark",
    "/icons/medications/pill-spark.svg",
    "https://example.com/icon.svg",
    "data:image/svg+xml,<svg/>",
    "<svg/>",
    "constructor",
    "__proto__",
  ]) {
    assert.equal(isMedicationSvgIcon(value), false, value);
    assert.equal(getSvgIcon(value), undefined, value);
  }
});

test("local SVG discovery supports English, German, direct IDs, and multiple words", () => {
  for (const [query, value] of [
    ["pill spark", "svg:pill-spark"],
    ["svg:orbit-tablets", "svg:orbit-tablets"],
    ["COZY-CUP", "svg:cozy-cup"],
    ["kaffee", "svg:cozy-cup"],
    ["herz blätter", "svg:heart-leaf"],
    ["sPrÖsSlInG", "svg:little-sprout"],
    ["schmetterling", "svg:butterfly"],
    ["sonne", "svg:sunny-side"],
    ["music", "svg:music-note"],
    ["ruhe welle", "svg:calm-wave"],
    ["svg mountain", "svg:mountain-path"],
  ]) {
    assert.ok(
      searchSvgIcons(query).some((entry) => entry.value === value),
      query,
    );
  }
  assert.equal(searchSvgIcons("calm wave")[0].value, "svg:calm-wave");
  assert.equal(searchSvgIcons("svg").length, SVG_ICON_CATALOG.length);
  assert.equal(searchSvgIcons("lokal").length, SVG_ICON_CATALOG.length);
});

test("empty and bounded SVG searches return predictable results", () => {
  for (const query of ["", "   ", "🌿", "zzzzmissingzzzz"])
    assert.deepEqual(searchSvgIcons(query), []);
  for (const limit of [0, -1, NaN, 0.5])
    assert.deepEqual(searchSvgIcons("svg", limit), []);
  assert.equal(searchSvgIcons("svg", 3).length, 3);
  assert.equal(searchSvgIcons("svg", 3.9).length, 3);
  assert.equal(searchSvgIcons("svg", Infinity).length, SVG_ICON_CATALOG.length);
});
