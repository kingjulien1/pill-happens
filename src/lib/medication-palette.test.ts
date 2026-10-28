import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { TAILWIND_MEDICATION_COLORS } from "./medication-palette";

const require = createRequire(import.meta.url);

test("the static palette includes every installed Tailwind family and shade", () => {
  const theme = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const names = Array.from(
    theme.matchAll(/--color-([a-z]+-\d+):/g),
    ([, name]) => `tw-${name}`,
  );
  assert.ok(names.length > 250);
  assert.deepEqual(
    TAILWIND_MEDICATION_COLORS.map(({ value }) => value),
    [...names, "tw-black", "tw-white"],
  );
  for (const family of ["mauve", "olive", "mist", "taupe"]) {
    for (const shade of [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ]) {
      assert.ok(names.includes(`tw-${family}-${shade}`));
    }
  }
});

test("palette IDs and accessible labels stay unique and all accents support hex alpha", () => {
  const values = TAILWIND_MEDICATION_COLORS.map(({ value }) => value);
  const labels = TAILWIND_MEDICATION_COLORS.map(({ label }) => label);
  assert.equal(new Set(values).size, values.length);
  assert.equal(new Set(labels).size, labels.length);
  for (const { value, label, hex } of TAILWIND_MEDICATION_COLORS) {
    assert.match(value, /^tw-(?:[a-z]+-(?:50|[1-9]00|950)|black|white)$/);
    assert.match(label, /^[A-Z][a-z]+(?: (?:50|[1-9]00|950))?$/);
    assert.match(hex, /^#[0-9a-f]{6}$/);
    assert.match(`${hex}26`, /^#[0-9a-f]{8}$/);
  }
});

test("representative colors retain their sRGB equivalents including clipped vivid shades", () => {
  const samples = {
    "tw-red-300": "#ffa2a2",
    "tw-orange-500": "#ff6900",
    "tw-yellow-200": "#fff085",
    "tw-lime-300": "#bbf451",
    "tw-sky-300": "#74d4ff",
    "tw-blue-300": "#8ec5ff",
    "tw-rose-400": "#ff637e",
    "tw-zinc-300": "#d4d4d8",
    "tw-black": "#000000",
    "tw-white": "#ffffff",
  };
  for (const [value, hex] of Object.entries(samples)) {
    assert.equal(
      TAILWIND_MEDICATION_COLORS.find((color) => color.value === value)?.hex,
      hex,
      value,
    );
  }
});
