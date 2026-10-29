import assert from "node:assert/strict";
import test from "node:test";
import { MEDICATION_COLORS } from "./medication-appearance";
import { TAILWIND_MEDICATION_COLORS } from "./medication-palette";
import {
  getMedicationColorScale,
  getMedicationPreviewSurface,
} from "./medication-preview-colors";

function hex(value: string) {
  const color = TAILWIND_MEDICATION_COLORS.find((item) => item.value === value);
  assert.ok(color, `${value} exists in the installed palette`);
  return color.hex;
}

test("preview gradients use actual neighboring Tailwind shades and a two-step deeper icon", () => {
  assert.deepEqual(getMedicationColorScale("tw-yellow-400"), {
    lighter: hex("tw-yellow-300"),
    darker: hex("tw-yellow-500"),
    icon: hex("tw-yellow-600"),
  });
  assert.deepEqual(getMedicationColorScale("tw-mist-600"), {
    lighter: hex("tw-mist-500"),
    darker: hex("tw-mist-700"),
    icon: hex("tw-mist-800"),
  });
});

test("endpoints clamp within the same family instead of wrapping to another hue", () => {
  assert.deepEqual(getMedicationColorScale("tw-rose-50"), {
    lighter: hex("tw-rose-50"),
    darker: hex("tw-rose-100"),
    icon: hex("tw-rose-200"),
  });
  assert.deepEqual(getMedicationColorScale("tw-blue-950"), {
    lighter: hex("tw-blue-900"),
    darker: hex("tw-blue-950"),
    icon: hex("tw-blue-950"),
  });
  assert.equal(getMedicationColorScale("tw-blue-900").icon, hex("tw-blue-950"));
});

test("black and white use neutral neighbors and preserve their endpoint pigment", () => {
  assert.deepEqual(getMedicationColorScale("tw-black"), {
    lighter: hex("tw-neutral-900"),
    darker: "#000000",
    icon: "#000000",
  });
  assert.deepEqual(getMedicationColorScale("tw-white"), {
    lighter: "#ffffff",
    darker: hex("tw-neutral-100"),
    icon: hex("tw-neutral-200"),
  });
});

test("legacy pigments choose a deterministic nearby ramp without changing stored colors", () => {
  // Slate's original 500 pigment exactly matches the installed 500 shade.
  const slate = MEDICATION_COLORS.find((color) => color.value === "slate")!;
  assert.deepEqual(getMedicationColorScale("slate"), {
    lighter: hex("tw-slate-400"),
    darker: hex("tw-slate-600"),
    icon: hex("tw-slate-700"),
  });
  assert.equal(slate.hex, "#64748b");
  assert.deepEqual(getMedicationColorScale("rose"), {
    lighter: hex("tw-orange-400"),
    darker: hex("tw-orange-600"),
    icon: hex("tw-orange-700"),
  });
  assert.deepEqual(getMedicationColorScale("violet"), {
    lighter: hex("tw-orange-100"),
    darker: hex("tw-orange-300"),
    icon: hex("tw-orange-400"),
  });
  assert.deepEqual(
    getMedicationColorScale("unknown"),
    getMedicationColorScale("rose"),
  );
  assert.deepEqual(getMedicationColorScale(), getMedicationColorScale("rose"));
});

test("every selectable palette entry produces valid opaque preview pigments", () => {
  for (const color of MEDICATION_COLORS) {
    const scale = getMedicationColorScale(color.value);
    for (const pigment of Object.values(scale))
      assert.match(pigment, /^#[0-9a-f]{6}$/);
  }
});

test("extreme preview pigments receive opaque contrasting neutral surfaces", () => {
  for (const pigment of ["#000000", hex("tw-zinc-950"), hex("tw-blue-900")]) {
    assert.equal(getMedicationPreviewSurface(pigment), "#f4f4f5");
  }
  for (const pigment of ["#ffffff", hex("tw-zinc-50"), hex("tw-yellow-100")]) {
    assert.equal(getMedicationPreviewSurface(pigment), "#18181b");
  }
});

test("middle preview pigments retain the existing popover and malformed input has no override", () => {
  for (const pigment of [
    "#808080",
    hex("tw-violet-500"),
    hex("tw-orange-600"),
  ]) {
    assert.equal(getMedicationPreviewSurface(pigment), undefined);
  }
  for (const value of ["", "red", "#fff", "#ffffff00", "not-a-color"])
    assert.equal(getMedicationPreviewSurface(value), undefined);
});

test("neutral overrides give every outlying palette pigment at least 3:1 contrast", () => {
  function luminance(hex: string) {
    const channels = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  for (const { hex: pigment } of TAILWIND_MEDICATION_COLORS) {
    const surface = getMedicationPreviewSurface(pigment);
    if (!surface) continue;
    const values = [luminance(pigment), luminance(surface)].sort(
      (a, b) => a - b,
    );
    assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 3, pigment);
  }
});
