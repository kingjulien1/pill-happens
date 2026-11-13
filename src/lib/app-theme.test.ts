import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { format } from "prettier";
import {
  APP_BACKGROUND_COLORS,
  APP_BACKGROUND_COLORS_BY_MODE,
  APP_FOUNDATION,
  APP_HARMONY,
  APP_COLORS,
  APP_PALETTE,
  APP_SECONDARY_COLOR,
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

test("the stable foundation and related harmony pigments supply unique paired semantic roles", () => {
  assert.equal(APP_PALETTE.length, 5);
  assert.deepEqual(
    new Set(APP_PALETTE.map((item) => item.hex)),
    new Set(["#2b233e", "#b7a4e5", "#f2b88f", "#111014", "#ffffff"]),
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
        luminance(item[mode]) >= luminance(APP_FOUNDATION.black) - 1e-9,
        `${mode} ${item.id} below Black`,
      );
      assert.ok(
        luminance(item[mode]) <= luminance(APP_FOUNDATION.white) + 1e-9,
        `${mode} ${item.id} above White`,
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

test("Indigo menu states keep opaque copy and keyboard focus readable in both modes", () => {
  const menuRoles = APP_THEME_TOKENS.filter((item) => item.group === "menus");
  assert.equal(menuRoles.length, 9);
  const surfaces = [
    "menu-surface",
    "menu-hover",
    "menu-selected",
    "menu-selected-focus",
  ] as const;
  for (const mode of ["light", "dark"] as const) {
    const values = APP_THEME_VALUES[mode];
    assert.notEqual(values["menu-surface"], values.popover);
    for (const item of menuRoles)
      assert.equal(item[mode].length, 7, `${mode} ${item.id} is opaque`);
    for (const [index, surface] of surfaces.entries()) {
      if (index > 0) {
        const preceding = luminance(values[surfaces[index - 1]]);
        const current = luminance(values[surface]);
        assert.ok(
          mode === "light" ? current < preceding : current > preceding,
          `${mode} ${surface} is distinct from the preceding state`,
        );
      }
      // Navigation retains its moving brand wash at no more than 10% opacity.
      for (const painted of [
        values[surface],
        mixAppColors(APP_FOUNDATION.lilac, values[surface], 0.1),
        mixAppColors(APP_FOUNDATION.apricot, values[surface], 0.1),
      ]) {
        for (const copy of [
          "menu-foreground",
          "menu-muted-foreground",
        ] as const) {
          const ratio = contrast(painted, values[copy]);
          assert.ok(
            ratio >= 4.5,
            `${mode} ${copy} on ${surface} (${painted}): ${ratio.toFixed(2)}:1`,
          );
        }
        assert.ok(
          contrast(painted, values["menu-focus-ring"]) >= 3,
          `${mode} menu keyboard focus on ${surface} (${painted})`,
        );
      }
    }
  }
});

function composite(color: string, background: `#${string}`): `#${string}` {
  const opacity = color.length === 9 ? parseInt(color.slice(7), 16) / 255 : 1;
  return mixAppColors(color as `#${string}`, background, opacity);
}

const readingSurfaces = [
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["muted", "muted-foreground"],
  ["surface-raised", "surface-raised-foreground"],
  ["surface-sunken", "surface-sunken-foreground"],
  ["surface-reading", "surface-reading-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
  ["info", "info-foreground"],
] as const;

test("Plum glass keeps opaque normal copy readable after alpha compositing in both modes", () => {
  for (const mode of ["light", "dark"] as const) {
    const backgrounds = [
      ...APP_BACKGROUND_COLORS_BY_MODE[mode],
      // Nested glass can also sit on either neutral or a chosen medication color.
      APP_FOUNDATION.black,
      APP_FOUNDATION.white,
    ];
    for (const [surface, copy] of readingSurfaces) {
      const wash = APP_THEME_VALUES[mode][surface];
      if (mode === "dark" && surface !== "popover" && surface !== "card")
        assert.equal(wash.slice(7), "f0", `${surface} keeps its 94% backplate`);
      else
        assert.equal(wash.length, 7, `${surface} is an opaque light surface`);
      assert.equal(
        APP_THEME_VALUES[mode][copy].length,
        7,
        `${copy} stays opaque`,
      );
      for (const behind of backgrounds) {
        const resolved = composite(wash, behind);
        assert.ok(
          contrast(resolved, APP_THEME_VALUES[mode][copy]) >= 4.5,
          `${mode} ${copy} on ${surface} over ${behind} remains readable`,
        );
        assert.ok(
          contrast(resolved, APP_THEME_VALUES[mode]["muted-foreground"]) >= 4.5,
          `${mode} secondary copy on ${surface} over ${behind} remains readable`,
        );
      }
    }
    for (const behind of APP_BACKGROUND_COLORS_BY_MODE[mode]) {
      for (const surface of [
        "empty-intake-wash",
        "empty-intake-hover",
      ] as const) {
        const resolved = composite(APP_THEME_VALUES[mode][surface], behind);
        assert.ok(
          contrast(resolved, APP_THEME_VALUES[mode]["empty-intake-copy"]) >=
            4.5,
        );
      }
    }
  }
});

test("canonical foundation names and compatibility ids describe the same five pigments", () => {
  assert.deepEqual(APP_FOUNDATION, {
    plum: "#2b233e",
    lilac: "#b7a4e5",
    apricot: "#f2b88f",
    black: "#111014",
    white: "#ffffff",
  });
  assert.deepEqual(APP_COLORS, {
    peach: APP_FOUNDATION.white,
    flame: APP_FOUNDATION.apricot,
    rust: APP_FOUNDATION.plum,
    ink: APP_FOUNDATION.black,
    violet: APP_FOUNDATION.lilac,
  });
  assert.deepEqual(APP_HARMONY, {
    rose: "#f9a8d4",
    iris: "#b7c9f5",
    mint: "#a7e4cf",
  });
  assert.deepEqual(
    APP_PALETTE.map(({ name }) => name),
    ["White", "Apricot", "Plum", "Black", "Lilac"],
  );
  for (const mode of ["light", "dark"] as const) {
    assert.equal(
      APP_THEME_VALUES[mode]["action-background"],
      APP_SECONDARY_COLOR,
    );
    assert.equal(
      APP_THEME_VALUES[mode]["action-foreground"],
      APP_FOUNDATION.white,
    );
  }
});

test("related reflections retain readable feature and card copy even where their washes overlap", () => {
  const harmonyRoles = APP_THEME_TOKENS.filter(
    (item) => item.group === "harmony",
  );
  assert.equal(harmonyRoles.length, 6);
  const washes = [
    "harmony-rose-wash",
    "harmony-iris-wash",
    "harmony-mint-wash",
  ] as const;
  for (const mode of ["light", "dark"] as const) {
    const values = APP_THEME_VALUES[mode];
    for (const surface of ["harmony-surface", "card", "popover"] as const) {
      assert.equal(
        values[surface].length,
        7,
        `${mode} ${surface} stays opaque`,
      );
      const overlapped = washes.reduce(
        (backplate, wash) => composite(values[wash], backplate),
        values[surface],
      );
      for (const foreground of [
        "card-foreground",
        "muted-foreground",
      ] as const) {
        assert.ok(
          contrast(overlapped, values[foreground]) >= 4.5,
          `${mode} ${foreground} on overlapping harmony washes over ${surface}`,
        );
      }
    }
  }
});

test("generated application and offline CSS match the documented registry", async () => {
  const css = await readFile(
    new URL("../app/theme.css", import.meta.url),
    "utf8",
  );
  assert.equal(css, await format(renderAppThemeCss(), { parser: "css" }));
  for (const [name, hex] of Object.entries(APP_FOUNDATION))
    assert.ok(css.includes(`--palette-${name}: ${hex};`));
  for (const [name, hex] of Object.entries(APP_HARMONY))
    assert.ok(css.includes(`--palette-${name}: ${hex};`));
  for (const { id, hex } of APP_PALETTE)
    assert.ok(css.includes(`--palette-${id}: ${hex};`));
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

test("mode-aware ramps and canvas copy remain readable throughout the moving field", () => {
  assert.equal(APP_BACKGROUND_COLORS, APP_BACKGROUND_COLORS_BY_MODE.dark);
  assert.equal(APP_THEME_VALUES.dark.background, APP_FOUNDATION.plum);
  assert.equal(
    APP_THEME_VALUES.light["canvas-foreground"],
    APP_FOUNDATION.black,
  );
  assert.equal(
    APP_THEME_VALUES.dark["canvas-foreground"],
    APP_FOUNDATION.white,
  );
  assert.notDeepEqual(
    APP_BACKGROUND_COLORS_BY_MODE.light,
    APP_BACKGROUND_COLORS_BY_MODE.dark,
  );
  const rampRoles = [
    "ambient-edge",
    "ambient-far",
    "ambient-mid",
    "ambient-near",
    "ambient-center",
  ] as const;
  for (const mode of ["light", "dark"] as const) {
    const ramp = APP_BACKGROUND_COLORS_BY_MODE[mode];
    assert.equal(ramp.length, 5);
    assert.deepEqual(
      ramp,
      rampRoles.map((id) => APP_THEME_VALUES[mode][id]),
    );
    // Test every blend of adjacent stops, not just endpoints. The overlay and
    // center scrim must preserve the same text contrast when composed above it.
    for (let segment = 0; segment < ramp.length - 1; segment++) {
      for (let step = 0; step <= 10; step++) {
        const base = mixAppColors(ramp[segment], ramp[segment + 1], step / 10);
        const veil = composite(APP_THEME_VALUES[mode]["ambient-overlay"], base);
        const scrim = composite(
          APP_THEME_VALUES[mode]["ambient-center-scrim"],
          veil,
        );
        for (const background of [base, veil, scrim]) {
          for (const copy of [
            "canvas-foreground",
            "canvas-muted-foreground",
          ] as const) {
            const resolvedCopy = composite(
              APP_THEME_VALUES[mode][copy],
              background,
            );
            assert.ok(
              contrast(resolvedCopy, background) >= 4.5,
              `${mode} ${copy} on ${background}`,
            );
          }
        }
      }
    }
  }
});

test("palette mixtures and alpha export have stable, clamped endpoints", () => {
  assert.equal(
    mixAppColors(APP_FOUNDATION.white, APP_FOUNDATION.plum, 0),
    APP_FOUNDATION.plum,
  );
  assert.equal(
    mixAppColors(APP_FOUNDATION.white, APP_FOUNDATION.plum, 1),
    APP_FOUNDATION.white,
  );
  assert.equal(
    mixAppColors(APP_FOUNDATION.white, APP_FOUNDATION.plum, -1),
    APP_FOUNDATION.plum,
  );
  assert.equal(
    mixAppColors(APP_FOUNDATION.white, APP_FOUNDATION.plum, 2),
    APP_FOUNDATION.white,
  );
  assert.equal(withAppAlpha(APP_FOUNDATION.white, 0), "#ffffff00");
  assert.equal(withAppAlpha(APP_FOUNDATION.black, 1), "#111014ff");
  assert.equal(withAppAlpha(APP_FOUNDATION.apricot, 0.5), "#f2b88f80");
  assert.equal(withAppAlpha(APP_FOUNDATION.lilac, -1), "#b7a4e500");
  assert.equal(withAppAlpha(APP_FOUNDATION.lilac, 2), "#b7a4e5ff");
});
