import assert from "node:assert/strict";
import test from "node:test";
import { MEDICATION_COLORS } from "./medication-appearance";
import { getMedicationBadgePaint } from "./medication-badge-paint";
import { getMedicationIconPigment } from "./medication-preview-colors";
import { SVG_ICON_CATALOG } from "./svg-icon-catalog";

function luminance(hex: string) {
  const channels = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("badge glyphs and inset rims retain every rendered medication pigment with readable opaque surfaces", () => {
  const pigments = new Set([
    "#000000",
    "#ffffff",
    ...MEDICATION_COLORS.map(({ value }) => getMedicationIconPigment(value)),
    ...SVG_ICON_CATALOG.flatMap((entry) =>
      entry.variant === "color" && entry.color ? [entry.color.hex] : [],
    ),
  ]);
  for (const pigment of pigments) {
    const paint = getMedicationBadgePaint(pigment);
    assert.equal(paint.copy, pigment);
    assert.equal(paint.rim, pigment);
    assert.match(paint.surface, /^#[0-9a-f]{6}$/i);
    const values = [luminance(paint.copy), luminance(paint.surface)].sort(
      (a, b) => a - b,
    );
    assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 3, pigment);
  }
});

test("badge themes follow authored SVG color instead of an unrelated selected swatch", () => {
  for (const entry of SVG_ICON_CATALOG) {
    if (entry.variant !== "color" || !entry.color) continue;
    for (const selected of ["tw-black", "tw-white", "tw-yellow-400"])
      assert.deepEqual(
        getMedicationBadgePaint(
          getMedicationIconPigment(selected, entry.value),
        ),
        getMedicationBadgePaint(entry.color.hex),
      );
  }
});

test("malformed pigments use the safe resolved default without mutating palette data", () => {
  const before = structuredClone(MEDICATION_COLORS);
  const fallback = getMedicationBadgePaint(getMedicationIconPigment());
  for (const invalid of ["", "red", "#fff", "#ffffff00", "not-a-color"])
    assert.deepEqual(getMedicationBadgePaint(invalid), fallback);
  assert.deepEqual(MEDICATION_COLORS, before);
});
