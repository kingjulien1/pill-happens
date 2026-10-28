import assert from "node:assert/strict";
import test from "node:test";
import {
  getMedicationColor,
  isMedicationIcon,
  isMedicationLucideIcon,
  MEDICATION_COLORS,
  MEDICATION_ICON_NAMES,
} from "./medication-appearance";
import type { Medication } from "./domain";
import { SVG_ICON_CATALOG } from "./svg-icon-catalog";

test("the expanded color registry preserves all 24 original choices and their order", () => {
  assert.ok(MEDICATION_COLORS.length > 300);
  assert.equal(
    new Set(MEDICATION_COLORS.map((color) => color.value)).size,
    MEDICATION_COLORS.length,
  );
  assert.deepEqual(MEDICATION_COLORS.slice(0, 24), [
    { value: "rose", label: "Ember", hex: "#f97316" },
    { value: "amber", label: "Clay", hex: "#9a3412" },
    { value: "violet", label: "Sand", hex: "#fed7aa" },
    { value: "coral", label: "Coral", hex: "#fb7185" },
    { value: "pink", label: "Pink", hex: "#ec4899" },
    { value: "raspberry", label: "Raspberry", hex: "#be185d" },
    { value: "ruby", label: "Ruby", hex: "#be123c" },
    { value: "orange", label: "Orange", hex: "#ea580c" },
    { value: "honey", label: "Honey", hex: "#d97706" },
    { value: "lemon", label: "Lemon", hex: "#eab308" },
    { value: "lime", label: "Lime", hex: "#84cc16" },
    { value: "olive", label: "Olive", hex: "#6b7b34" },
    { value: "green", label: "Green", hex: "#16a34a" },
    { value: "mint", label: "Mint", hex: "#34d399" },
    { value: "teal", label: "Teal", hex: "#0d9488" },
    { value: "cyan", label: "Cyan", hex: "#06b6d4" },
    { value: "sky", label: "Sky", hex: "#38bdf8" },
    { value: "blue", label: "Blue", hex: "#3b82f6" },
    { value: "indigo", label: "Indigo", hex: "#6366f1" },
    { value: "purple", label: "Purple", hex: "#a855f7" },
    { value: "lilac", label: "Lilac", hex: "#c4b5fd" },
    { value: "plum", label: "Plum", hex: "#86198f" },
    { value: "slate", label: "Slate", hex: "#64748b" },
    { value: "ink", label: "Ink", hex: "#334155" },
  ]);
  for (const color of MEDICATION_COLORS) {
    assert.match(color.hex, /^#[0-9a-f]{6}$/);
    assert.equal(getMedicationColor(color.value), color);
  }
});

test("appearance fallbacks safely render existing medication records", () => {
  const legacy: Medication = {
    id: "legacy-medication",
    name: "Example",
    strengthMg: 1,
    form: "tablet",
    color: "rose",
    archived: false,
    createdAt: "2026-10-26T12:00:00.000Z",
  };
  assert.equal(legacy.icon, undefined);
  assert.equal(getMedicationColor(legacy.color).label, "Ember");
  assert.equal(getMedicationColor(), MEDICATION_COLORS[0]);
  for (const value of [
    "unknown-color",
    "tw-red-250",
    "tw-black-500",
    "#ffffff",
    "url(https://example.com/image)",
    "constructor",
    "__proto__",
  ])
    assert.equal(getMedicationColor(value), MEDICATION_COLORS[0]);
});

test("the expanded Lucide allowlist retains legacy names and rejects arbitrary names", () => {
  assert.ok(MEDICATION_ICON_NAMES.length > 1_500);
  assert.equal(
    new Set(MEDICATION_ICON_NAMES).size,
    MEDICATION_ICON_NAMES.length,
  );
  for (const name of MEDICATION_ICON_NAMES)
    assert.equal(isMedicationIcon(name), true, name);
  for (const name of [
    "capsule",
    "flower-2",
    "circle-dot",
    "bird",
    "guitar",
    "squirrel",
  ])
    assert.equal(isMedicationLucideIcon(name), true, name);
  for (const name of [
    "Pill",
    "pill-icon",
    "unknown-icon",
    "pill heart",
    "../pill",
    "constructor",
    "__proto__",
  ])
    assert.equal(isMedicationIcon(name), false, name);
  assert.equal(isMedicationLucideIcon("💊"), false);
});

test("one emoji can include variation selectors, skin tone, ZWJ, flags, and keycaps", () => {
  const emoji = [
    "💊",
    "☀️",
    "❤️",
    "👩🏽‍⚕️",
    "👨‍👩‍👧‍👦",
    "🏳️‍🌈",
    "🧑🏿‍🦽",
    "🏴‍☠️",
    "🇦🇹",
    "🇺🇳",
    "1️⃣",
    "#️⃣",
    // England's subdivision flag uses tag characters inside one grapheme.
    "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  ];
  for (const value of emoji) assert.equal(isMedicationIcon(value), true, value);
});

test("local SVG names are allowlisted separately from Lucide and never accept paths or markup", () => {
  assert.ok(SVG_ICON_CATALOG.length > 0);
  for (const { value } of SVG_ICON_CATALOG) {
    assert.equal(isMedicationIcon(value), true, value);
    assert.equal(isMedicationLucideIcon(value), false, value);
  }
  for (const value of [
    "svg:unknown",
    "SVG:pill-spark",
    "svg:../pill-spark",
    "svg:pill-spark.svg",
    'svg:pill-spark" onload="alert(1)',
    "/icons/medications/pill-spark.svg",
    "https://example.com/pill.svg",
    "data:image/svg+xml,<svg/>",
    "<svg><script>alert(1)</script></svg>",
    "svg:constructor",
    "svg:__proto__",
    "svg:color:unknown",
    "svg:color:../valium",
    "svg:color:valium.svg",
    "svg:color:constructor",
    "Bromazepam",
    "Valium",
  ]) {
    assert.equal(isMedicationIcon(value), false, value);
  }
});

test("emoji validation rejects text, HTML, multiple emoji, fragments, and oversized input", () => {
  const invalid = [
    "",
    " ",
    "ordinary text",
    "<svg />",
    '<img src="x" onerror="alert(1)">',
    "🙂🙂",
    "🙂 🩷",
    "A🙂",
    "🙂A",
    "🇦",
    "🇦🇹🇩🇪",
    "1",
    "#",
    "🏻",
    "👩‍",
    "💊\uFE0F\uFE0F",
    "💊\u0301",
    "💊\n",
    "🌙".repeat(33),
  ];
  for (const value of invalid)
    assert.equal(isMedicationIcon(value), false, value);
});
