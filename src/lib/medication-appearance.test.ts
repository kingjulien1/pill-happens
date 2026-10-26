import assert from "node:assert/strict";
import test from "node:test";
import {
  getMedicationColor,
  isMedicationIcon,
  MEDICATION_COLORS,
  MEDICATION_ICON_NAMES,
} from "./medication-appearance";
import type { Medication } from "./domain";

test("the 24-color registry retains the three persisted legacy keys", () => {
  assert.equal(MEDICATION_COLORS.length, 24);
  assert.equal(new Set(MEDICATION_COLORS.map((color) => color.value)).size, 24);
  assert.deepEqual(MEDICATION_COLORS.slice(0, 3), [
    { value: "rose", label: "Ember", hex: "#f97316" },
    { value: "amber", label: "Clay", hex: "#9a3412" },
    { value: "violet", label: "Sand", hex: "#fed7aa" },
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
  assert.equal(getMedicationColor("unknown-color"), MEDICATION_COLORS[0]);
});

test("all supported Lucide names are accepted without opening arbitrary icon names", () => {
  assert.equal(MEDICATION_ICON_NAMES.length, 20);
  for (const name of MEDICATION_ICON_NAMES)
    assert.equal(isMedicationIcon(name), true, name);
  for (const name of ["Pill", "pill-icon", "unknown-icon", "pill heart"]) {
    assert.equal(isMedicationIcon(name), false, name);
  }
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
