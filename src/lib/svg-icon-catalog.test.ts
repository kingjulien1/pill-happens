import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { EMOJI_CATALOG } from "./emoji-catalog";
import { normalizeIconQuery } from "./icon-names";
import { LUCIDE_ICON_NAMES } from "./lucide-icon-names";
import { TABLET_SHAPES } from "./tablet-icons/geometry";
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
  const files = (base: URL, prefix = ""): string[] =>
    readdirSync(base, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(new URL(`${entry.name}/`, base), `${prefix}${entry.name}/`)
        : entry.name.endsWith(".svg")
          ? [`${prefix}${entry.name}`]
          : [],
    );
  assert.deepEqual(
    files(directory).sort(),
    SVG_ICON_CATALOG.map(({ src }) =>
      src.slice("/icons/medications/".length),
    ).sort(),
  );
  for (const entry of SVG_ICON_CATALOG) {
    assert.match(entry.value, /^svg:(?:color:)?[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(entry.value.length <= 64);
    const slug = entry.value.replace(/^svg:(?:color:)?/, "");
    assert.equal(
      entry.src,
      entry.variant === "mask"
        ? `/icons/medications/${slug}.svg`
        : `/icons/medications/tablets/${entry.variant}/${slug}.svg`,
    );
    assert.ok(entry.label.length > 0);
    assert.ok(entry.componentName.length > 0);
    assert.equal(isMedicationSvgIcon(entry.value), true);
    assert.equal(getSvgIcon(entry.value), entry);
    const svg = readFileSync(
      new URL(entry.src.slice(1), new URL("../../public/", import.meta.url)),
      "utf8",
    );
    assert.match(svg, /^<svg\s/);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(
      svg,
      entry.variant === "mask" ? /stroke-width="2\.5"/ : /stroke-width="2"/,
    );
    assert.match(svg, /<\/(?:svg)>\s*$/);
    assert.doesNotMatch(
      svg,
      /<(?:script|foreignObject|image|iframe|style|linearGradient|radialGradient|filter)\b|\bon[a-z]+\s*=|\b(?:href|src)\s*=/i,
    );
    for (const [, target] of svg.matchAll(/url\(([^)]+)\)/g)) {
      assert.match(target, /^#[a-z0-9-]+$/, entry.value);
      assert.ok(svg.includes(`id="${target.slice(1)}"`), entry.value);
    }
    if (entry.variant !== "mask") {
      const root = svg.match(/<svg\b[\s\S]*?>/)![0];
      for (const attribute of [
        'xmlns="http://www.w3.org/2000/svg"',
        'width="24"',
        'height="24"',
        'fill="none"',
        'stroke="currentColor"',
        'stroke-linecap="round"',
        'stroke-linejoin="round"',
      ])
        assert.ok(root.includes(attribute), `${entry.value}: ${attribute}`);
    }
    if (entry.variant === "color") {
      assert.ok(entry.color);
      const visible = svg.replace(/<defs>[\s\S]*?<\/defs>/g, "");
      const paints = [...visible.matchAll(/(?:fill|stroke)="([^"]+)"/g)]
        .map(([, color]) => color)
        .filter((color) => color !== "none" && color !== "currentColor");
      assert.deepEqual([...new Set(paints)], [entry.color.hex]);
      assert.doesNotMatch(svg, /\b(?:opacity|fill-opacity|stroke-opacity)=/);
    }
  }
});

test("SVG values are a strict allowlist rather than arbitrary file paths or markup", () => {
  for (const value of [
    "",
    "svg:unknown",
    "svg:../pill-spark",
    "svg:color:unknown",
    "svg:color:../viagra",
    "svg:color:euthyrox.svg",
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

test("tablet variants preserve requested names, dose labels, color metadata, and unique generic aliases", () => {
  const outlines = SVG_ICON_CATALOG.filter(
    ({ variant }) => variant === "outline",
  );
  const colors = SVG_ICON_CATALOG.filter(({ variant }) => variant === "color");
  assert.equal(outlines.length, Object.keys(TABLET_SHAPES).length);
  assert.equal(colors.length, 16);
  for (const [slug, label] of [
    ["bromazepam", "Bromazepam"],
    ["diazepam", "Diazepam"],
    ["alprazolam", "Alprazolam"],
    ["valium", "Valium"],
    ["ritalin", "Ritalin"],
    ["quetialan-100", "Quetialan 100mg"],
    ["dominal-forte", "Dominal Forte"],
    ["queatialan-25", "Queatialan 25mg"],
    ["queatialan-200", "Queatialan 200mg"],
    ["venlafaxin", "Venlafaxin"],
    ["viagra", "Viagra"],
    ["euthyrox", "Euthyrox"],
    ["tadalafil-5", "Tadalafil 5mg"],
    ["tadalafil-10", "Tadalafil 10mg"],
    ["tramal", "Tramal"],
    ["testavan", "Testavan"],
  ])
    assert.equal(getSvgIcon(`svg:color:${slug}`)?.label, label);
  for (const slug of [
    "valium",
    "ritalin",
    "queatialan-200",
    "venlafaxin",
    "euthyrox",
    "testavan",
  ])
    assert.equal(
      getSvgIcon(`svg:color:${slug}`)?.color?.hex.toLowerCase(),
      "#d4d4d8",
    );
  const existing = new Set(
    [...LUCIDE_ICON_NAMES, ...EMOJI_CATALOG.map(({ label }) => label)].map(
      normalizeIconQuery,
    ),
  );
  for (const shape of [
    "tablet-meridian",
    "tablet-pebble",
    "tablet-halo",
  ] as const) {
    assert.equal(TABLET_SHAPES[shape].aliases.length, 3);
    for (const alias of TABLET_SHAPES[shape].aliases) {
      assert.ok(!existing.has(normalizeIconQuery(alias)), alias);
      assert.equal(searchSvgIcons(alias)[0].value, `svg:${shape}`);
    }
  }
});

test("SVG component names, display labels, namespaces, and spelling aliases all resolve", () => {
  for (const [query, value] of [
    ["TabletMeridian", "svg:tablet-meridian"],
    ["TabletBisect", "svg:tablet-meridian"],
    ["TabletEquator", "svg:tablet-meridian"],
    ["HeartLeaf", "svg:heart-leaf"],
    ["Quetialan100", "svg:color:quetialan-100"],
    ["Quetialan100mg", "svg:color:quetialan-100"],
    ["Queatialan100mg", "svg:color:quetialan-100"],
    ["Quetialan25mg", "svg:color:queatialan-25"],
    ["Queatialan 200mg", "svg:color:queatialan-200"],
    ["ViagraColor", "svg:color:viagra"],
    ["EuthyroxColor", "svg:color:euthyrox"],
    ["svg:color:ritalin", "svg:color:ritalin"],
    ["Venlafaxin", "svg:color:venlafaxin"],
    ["Tadalafil5", "svg:tadalafil-5"],
    ["Tadalafil 5mg", "svg:color:tadalafil-5"],
    ["Tadalafil10", "svg:tadalafil-10"],
    ["Tadalafil10Color", "svg:color:tadalafil-10"],
    ["Tramal", "svg:tramal"],
    ["TramalColor", "svg:color:tramal"],
    ["Testavan", "svg:testavan"],
    ["TestavanColor", "svg:color:testavan"],
  ])
    assert.ok(
      searchSvgIcons(query).some((entry) => entry.value === value),
      query,
    );
  assert.equal(searchSvgIcons("color").length, 16);
  assert.ok(
    searchSvgIcons("colored").every(({ variant }) => variant === "color"),
  );
  assert.ok(
    searchSvgIcons("outline").every(({ variant }) => variant === "outline"),
  );
  assert.equal(
    searchSvgIcons("outline").length,
    Object.keys(TABLET_SHAPES).length,
  );
  assert.equal(searchSvgIcons("euthyrox").length, 2);
  assert.equal(searchSvgIcons("viagra").length, 2);
  for (const slug of ["tadalafil-5", "tadalafil-10", "tramal", "testavan"]) {
    assert.deepEqual(
      new Set(searchSvgIcons(slug).map(({ value }) => value)),
      new Set([`svg:${slug}`, `svg:color:${slug}`]),
    );
    assert.equal(
      getSvgIcon(`svg:${slug}`)?.label,
      getSvgIcon(`svg:color:${slug}`)?.label,
    );
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

test("metered dispensers are searchable by context without being classified as tablets", () => {
  for (const [query, value] of [
    ["dosierpumpe", "svg:tramal"],
    ["metered pump", "svg:color:tramal"],
    ["gel dispenser", "svg:testavan"],
  ])
    assert.ok(
      searchSvgIcons(query).some((entry) => entry.value === value),
      query,
    );
  const tablets = searchSvgIcons("tablets");
  for (const slug of ["tramal", "testavan"])
    assert.ok(!tablets.some(({ shape }) => shape === slug), slug);
});

test("the two Tadalafil strengths preserve a shared centered silhouette and separate vector imprints", () => {
  const five = TABLET_SHAPES["tadalafil-5"].nodes;
  const ten = TABLET_SHAPES["tadalafil-10"].nodes;
  assert.deepEqual(five[0], ten[0]);
  assert.equal(five[0][0], "ellipse");
  assert.equal(five[0][1].cx, "12");
  assert.equal(five[0][1].cy, "12");
  assert.notDeepEqual(five.slice(1), ten.slice(1));
  for (const slug of ["tadalafil-5", "tadalafil-10"]) {
    assert.equal(getSvgIcon(`svg:${slug}`)?.shape, slug);
    assert.equal(getSvgIcon(`svg:color:${slug}`)?.shape, slug);
  }
  assert.equal(getSvgIcon("svg:color:tadalafil-5")?.color?.name, "Amber 400");
  assert.equal(getSvgIcon("svg:color:tadalafil-10")?.color?.name, "Blue 600");
});

test("all round silhouettes and their vertical scores share the viewport center", () => {
  for (const [name, { nodes }] of Object.entries(TABLET_SHAPES)) {
    const [tag, body] = nodes[0];
    if (tag !== "circle" && tag !== "ellipse") continue;
    assert.equal(body.cx, "12", name);
    assert.equal(body.cy, "12", name);
    const score = nodes.find(([, attrs]) => attrs.key === "score")?.[1];
    if (!score) continue;
    assert.ok("d" in score, `${name}: the score is a path`);
    const line = String(score.d).match(/^M([\d.]+) ([\d.]+)v([\d.]+)$/);
    assert.ok(line, `${name}: the score is straight and upright`);
    assert.equal(Number(line[1]), 12, `${name}: horizontal position`);
    assert.ok(
      Math.abs(Number(line[2]) + Number(line[3]) / 2 - 12) < 1e-9,
      `${name}: vertical position`,
    );
  }
});
