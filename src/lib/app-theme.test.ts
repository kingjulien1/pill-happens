import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { format } from "prettier";
import {
  APP_BACKGROUND_COLORS,
  APP_COLORS,
  APP_PALETTE,
  APP_THEME_GROUPS,
  APP_THEME_TOKENS,
  APP_THEME_VALUES,
  mixAppColors,
  renderAppThemeCss,
  withAppAlpha,
} from "./app-theme";

const channels = (hex: string) =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
function contrast(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("one five-color palette supplies unique documented semantic roles in both modes", () => {
  assert.equal(APP_PALETTE.length, 5);
  assert.deepEqual(
    new Set(APP_PALETTE.map((item) => item.hex)),
    new Set(["#fed7aa", "#f97316", "#9a3412", "#2a0f0a", "#623cea"]),
  );
  assert.equal(
    new Set(APP_THEME_TOKENS.map((item) => item.id)).size,
    APP_THEME_TOKENS.length,
  );
  assert.equal(
    new Set(APP_THEME_TOKENS.map((item) => item.token)).size,
    APP_THEME_TOKENS.length,
  );
  assert.ok(APP_THEME_TOKENS.length >= 40);
  assert.ok(
    APP_THEME_TOKENS.filter((item) => item.group === "surfaces").length >= 12,
  );
  const groups = new Set(APP_THEME_GROUPS.map((item) => item.id));
  const ids = new Set<string>(APP_THEME_TOKENS.map((item) => item.id));
  for (const item of APP_THEME_TOKENS) {
    assert.ok(groups.has(item.group));
    assert.ok(item.label && item.description);
    assert.equal(item.token, `--${item.id}`);
    for (const pair of item.pairsWith)
      assert.ok(ids.has(pair), `${item.id} pairs with missing ${pair}`);
    for (const mode of ["light", "dark"] as const) {
      assert.match(item[mode], /^#[\da-f]{6}(?:[\da-f]{2})?$/);
      assert.equal(APP_THEME_VALUES[mode][item.id], item[mode]);
      assert.ok(
        luminance(item[mode]) >= luminance(APP_COLORS.ink) - 1e-9,
        `${mode} ${item.id} below Ink`,
      );
      assert.ok(
        luminance(item[mode]) <= luminance(APP_COLORS.peach) + 1e-9,
        `${mode} ${item.id} above Peach`,
      );
    }
  }
  for (const mode of ["light", "dark"] as const) {
    assert.equal(
      Object.keys(APP_THEME_VALUES[mode]).length,
      APP_THEME_TOKENS.length,
    );
  }
});

test("small copy clears 4.5:1 contrast on its intended solid surfaces in each mode", () => {
  const pairs = [
    ["background", "foreground"],
    ["card", "card-foreground"],
    ["popover", "popover-foreground"],
    ["muted", "muted-foreground"],
    ["background", "muted-foreground"],
    ["card", "muted-foreground"],
    ["surface-raised", "surface-raised-foreground"],
    ["surface-sunken", "surface-sunken-foreground"],
    ["surface-inverse", "surface-inverse-foreground"],
    ["surface-reading", "surface-reading-foreground"],
    ["primary", "primary-foreground"],
    ["action-background", "action-foreground"],
    ["secondary", "secondary-foreground"],
    ["accent", "accent-foreground"],
    ["destructive", "destructive-foreground"],
    ["success", "success-foreground"],
    ["warning", "warning-foreground"],
    ["info", "info-foreground"],
  ] as const;
  for (const mode of ["light", "dark"] as const) {
    for (const [surface, copy] of pairs) {
      const ratio = contrast(
        APP_THEME_VALUES[mode][surface],
        APP_THEME_VALUES[mode][copy],
      );
      assert.ok(
        ratio >= 4.5,
        `${mode} ${copy} on ${surface}: ${ratio.toFixed(2)}:1`,
      );
    }
    assert.ok(
      contrast(APP_THEME_VALUES[mode].ring, APP_THEME_VALUES[mode].popover) >=
        3,
    );
  }
});

test("generated application and offline CSS match the documented registry", async () => {
  const css = await readFile(
    new URL("../app/theme.css", import.meta.url),
    "utf8",
  );
  assert.equal(css, await format(renderAppThemeCss(), { parser: "css" }));
  const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
  for (const [mode, output] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    for (const item of APP_THEME_TOKENS)
      assert.ok(output.includes(`${item.token}: ${item[mode]};`));
    assert.match(output, new RegExp(`color-scheme: ${mode}`));
  }
  const offline = await readFile(
    new URL("../../public/offline.html", import.meta.url),
    "utf8",
  );
  const [offlineLight, offlineDark] = offline
    .split("@media (prefers-color-scheme: dark)")
    .slice(0, 2);
  for (const [mode, output] of [
    ["light", offlineLight],
    ["dark", offlineDark],
  ] as const) {
    for (const id of [
      "background",
      "foreground",
      "card",
      "muted-foreground",
      "primary",
      "primary-foreground",
    ] as const) {
      assert.ok(output.includes(`--${id}: ${APP_THEME_VALUES[mode][id]};`));
    }
    assert.ok(
      offline.includes(`content="${APP_THEME_VALUES[mode].background}"`),
    );
  }
});

test("background ramp ends in Ink and never substitutes pale or white colors for light mode", () => {
  assert.equal(APP_BACKGROUND_COLORS[0], APP_COLORS.peach);
  assert.equal(APP_BACKGROUND_COLORS.at(-1), APP_COLORS.ink);
  assert.deepEqual(
    new Set(APP_BACKGROUND_COLORS),
    new Set(APP_PALETTE.map((item) => item.hex)),
  );
  assert.equal(APP_THEME_VALUES.light.background, "#f3cda2");
  assert.equal(APP_THEME_VALUES.dark.background, APP_COLORS.ink);
  assert.equal(APP_THEME_VALUES.light["ambient-center"], APP_COLORS.ink);
  assert.equal(APP_THEME_VALUES.dark["ambient-center"], APP_COLORS.ink);
  for (const mode of ["light", "dark"] as const) {
    assert.equal(APP_THEME_VALUES[mode]["canvas-foreground"], APP_COLORS.peach);
    const muted = APP_THEME_VALUES[mode]["canvas-muted-foreground"];
    const opacity = parseInt(muted.slice(7, 9), 16) / 255;
    const resolvedMuted = mixAppColors(muted, APP_COLORS.ink, opacity);
    assert.ok(
      contrast(APP_THEME_VALUES[mode]["canvas-foreground"], APP_COLORS.ink) >=
        4.5,
    );
    assert.ok(contrast(resolvedMuted, APP_COLORS.ink) >= 4.5);
  }
});

test("palette mixtures and alpha export have stable endpoints without adding white or black", () => {
  assert.equal(
    mixAppColors(APP_COLORS.peach, APP_COLORS.ink, 0),
    APP_COLORS.ink,
  );
  assert.equal(
    mixAppColors(APP_COLORS.peach, APP_COLORS.ink, 1),
    APP_COLORS.peach,
  );
  assert.equal(
    mixAppColors(APP_COLORS.peach, APP_COLORS.ink, 0.95),
    APP_THEME_VALUES.light.background,
  );
  assert.equal(withAppAlpha(APP_COLORS.peach, 0), "#fed7aa00");
  assert.equal(withAppAlpha(APP_COLORS.ink, 1), "#2a0f0aff");
  assert.equal(withAppAlpha(APP_COLORS.flame, 0.5), "#f9731680");
});
