import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACCENT_RADIUS_RATIO,
  ACTION_BUTTON_ROSE_SHARE,
  ACTION_BUTTON_TINT,
  ACTION_BUTTON_SHAPE_REFERENCE,
  BUTTON_SIZE_BANDS,
  BUTTON_SYSTEM,
  INTAKE_ACTION_GEOMETRY,
  INTAKE_ACTION_PAINT,
  INTAKE_ACTION_SUPPORTING_PAINT,
  getAccentButtonDimensions,
  getAccentRadiusStyle,
  getButtonSizeStyle,
  getButtonThemeStyle,
  getIntakeActionThemeStyle,
  getIntakeBrandStyle,
  getBrandThemeStyle,
  getJournalSymbolPaintStyle,
} from "./action-button-system";

test("the 13% tint preserves readable white copy and pink icons at every pigment stop", () => {
  const rgba = (hex: string) => [
    ...[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)),
    hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1,
  ];
  const luminance = (channels: number[]) => {
    const linear = channels.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const haze = rgba(INTAKE_ACTION_SUPPORTING_PAINT["--accent-field-haze"]);
  assert.equal(ACTION_BUTTON_TINT.opacity, 0.13);
  assert.equal(
    ACTION_BUTTON_TINT.emerald,
    "var(--color-pink-500, oklch(65.6% 0.241 354.308))",
  );
  for (const mode of ["light", "dark"] as const) {
    const paint = INTAKE_ACTION_PAINT[mode];
    assert.equal(paint.base, "#1d161e");
    assert.equal(paint.text, "#ffffff");
    for (const color of [paint.base, ...paint.fieldColors]) {
      const surface = rgba(color);
      const base = rgba(paint.base);
      const field = surface.map(
        (channel, index) =>
          channel * paint.fieldOpacity + base[index] * (1 - paint.fieldOpacity),
      );
      const reflected = field.map(
        (channel, index) => haze[index] * haze[3] + channel * (1 - haze[3]),
      );
      // Any mixture of these stops stays within this contrast envelope.
      for (const tint of [
        "#f6339a",
        ...paint.rimColors,
        INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
      ]) {
        const tinted = reflected.map(
          (channel, index) =>
            rgba(tint)[index] * ACTION_BUTTON_TINT.opacity +
            channel * (1 - ACTION_BUTTON_TINT.opacity),
        );
        for (const ink of [
          paint.text,
          INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
        ])
          assert.ok(
            (luminance(rgba(ink)) + 0.05) / (luminance(tinted) + 0.05) >= 4.5,
            `${mode} ${color} + ${tint} keeps ${ink} readable`,
          );
      }
    }
  }
});

test("every filled-action kind shares Today’s complete paint without changing geometry or branding", () => {
  const before = structuredClone(BUTTON_SYSTEM);
  for (const mode of ["light", "dark"] as const) {
    const today = getIntakeActionThemeStyle(mode);
    for (const kind of ["primary", "secondary", "accent"] as const) {
      const shared = getButtonThemeStyle(kind, mode);
      assert.deepEqual(
        BUTTON_SYSTEM[kind].themes[mode],
        INTAKE_ACTION_PAINT[mode],
      );
      for (const [key, value] of Object.entries(today)) {
        if (key.startsWith("--action-base-")) continue;
        assert.equal(
          shared[key as keyof typeof shared],
          value,
          `${kind} shares ${key}`,
        );
      }
      assert.equal(
        shared["--action-base-height" as keyof typeof shared],
        `${BUTTON_SYSTEM[kind].height}px`,
      );
      assert.equal(
        shared["--action-tint-opacity" as keyof typeof shared],
        0.13,
      );
      assert.equal(shared.colorScheme, mode);
    }
  }
  assert.deepEqual(getIntakeBrandStyle(), {
    "--brand-surface": "#1d161e",
    "--brand-copy": "#f9a8d4",
  });
  assert.equal(BUTTON_SYSTEM.primary.height, 62);
  assert.equal(BUTTON_SYSTEM.secondary.height, 48);
  assert.deepEqual(BUTTON_SYSTEM, before);
});

test("decorative journal pigments stay outside the filled-action paint update", () => {
  assert.ok(ACTION_BUTTON_ROSE_SHARE > 0 && ACTION_BUTTON_ROSE_SHARE <= 0.08);
  const art = getJournalSymbolPaintStyle();
  assert.notEqual(
    art["--action-light-base" as keyof typeof art],
    INTAKE_ACTION_PAINT.light.base,
  );
  const original = ["#49385e", "#2b233e", "#675278", "#332a48"];
  original.forEach((before, index) => {
    const next = String(
      art[`--action-light-field-${index + 1}` as keyof typeof art],
    );
    assert.notEqual(next, before);
    for (const offset of [1, 3, 5]) {
      const delta = Math.abs(
        parseInt(next.slice(offset, offset + 2), 16) -
          parseInt(before.slice(offset, offset + 2), 16),
      );
      assert.ok(
        delta <= 14,
        "Journal artwork retains its small Rose admixture",
      );
    }
  });
});

test("live branding shares the CTA’s charcoal, pink accent and rim reflections", () => {
  const paint = getBrandThemeStyle();
  const color = (name: string) => paint[name as keyof typeof paint];
  assert.equal(color("--brand-surface"), INTAKE_ACTION_PAINT.light.base);
  assert.equal(
    color("--brand-copy"),
    INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
  );
  assert.equal(color("--brand-ink"), color("--brand-copy"));
  assert.deepEqual(
    [
      color("--brand-copy"),
      color("--brand-tone-ice"),
      color("--brand-tone-teal"),
    ],
    INTAKE_ACTION_PAINT.light.rimColors,
  );
  // The pink modes have distinct second stops; Ice keeps its light-rim role.
  assert.equal(
    color("--brand-tone-pale"),
    INTAKE_ACTION_PAINT.dark.rimColors[0],
  );
  assert.equal(
    color("--brand-tone-seafoam"),
    INTAKE_ACTION_PAINT.dark.rimColors[2],
  );
  assert.equal(color("--brand-tone-emerald"), ACTION_BUTTON_TINT.emerald);
  assert.ok(Object.keys(paint).every((key) => key.startsWith("--brand-")));
  assert.deepEqual(Object.keys(getIntakeBrandStyle()).sort(), [
    "--brand-copy",
    "--brand-surface",
  ]);
});

test("CSS-first specular colors match both rendered button palettes before WebGL starts", () => {
  const source = readFileSync(
    new URL("../app/action-button-palette.css", import.meta.url),
    "utf8",
  );
  const [lightCss, darkCss] = source.split(
    "@media (prefers-color-scheme: dark)",
  );
  const stops = (css: string) =>
    Object.fromEntries(
      [...css.matchAll(/--intake-rim-stop-(\d):\s*(#[\da-f]{6});/g)].map(
        (match) => [match[1], match[2]],
      ),
    );
  const light = stops(lightCss);
  const dark = { ...light, ...stops(darkCss) };
  for (const [mode, actual] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    const rim = BUTTON_SYSTEM.accent.themes[mode].rimColors;
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((i) => actual[i]),
      [rim[0], rim[1], rim[2], rim[0], rim[1]],
    );
  }
});

test("Today is shorter while Accent defaults retain the fixed shape reference across every band", () => {
  assert.deepEqual(ACTION_BUTTON_SHAPE_REFERENCE, { height: 80, radius: 21 });
  assert.deepEqual(INTAKE_ACTION_GEOMETRY, { height: 74, radius: 19.425 });
  assert.equal(ACCENT_RADIUS_RATIO, 0.2625);
  assert.equal(BUTTON_SYSTEM.accent.height, 72);
  assert.equal(BUTTON_SYSTEM.accent.radius, 18.9);
  const dimensions = BUTTON_SIZE_BANDS.map((band) => {
    const geometry = getAccentButtonDimensions(band.step);
    assert.equal(geometry.height, 72 + band.heightIncrement);
    assert.ok(
      Math.abs(geometry.radius / geometry.height - ACCENT_RADIUS_RATIO) < 1e-12,
    );
    assert.ok(
      geometry.radius < geometry.height / 2,
      "The shape keeps straight sides instead of becoming a capsule",
    );
    return geometry;
  });
  assert.deepEqual(dimensions[0], { height: 72, radius: 18.9 });
  assert.deepEqual(dimensions[5], { height: 75.75, radius: 19.884375 });
  assert.deepEqual(dimensions[6], dimensions[5]);
  assert.deepEqual(dimensions[7], dimensions[5]);
});

test("Accent explicit corners remain authoritative at every size while default style follows responsive variables", () => {
  const defaults = getAccentRadiusStyle();
  assert.equal(
    defaults.borderRadius,
    defaults["--accent-radius" as keyof typeof defaults],
  );
  assert.match(String(defaults.borderRadius), /var\(--action-base-height/);
  assert.match(String(defaults.borderRadius), /var\(--action-size-step/);
  assert.doesNotMatch(String(defaults.borderRadius), /--dialog-action-radius/);
  for (const band of BUTTON_SIZE_BANDS) {
    const overridden = getAccentButtonDimensions(band.step, 12);
    assert.equal(
      overridden.height,
      getAccentButtonDimensions(band.step).height,
    );
    assert.equal(overridden.radius, 12);
    assert.deepEqual(getAccentRadiusStyle(12), {
      borderRadius: "12px",
      "--accent-radius": "12px",
    });
  }
  assert.deepEqual(getAccentRadiusStyle(0), {
    borderRadius: "0px",
    "--accent-radius": "0px",
  });
});

test("geometry sanitizes invalid sizes consistently with the existing size style and does not mutate recipes", () => {
  const before = structuredClone(BUTTON_SYSTEM);
  for (const step of [-5, 0, 2.5, 5, 9, NaN, Infinity]) {
    const bounded =
      getButtonSizeStyle(step)[
        "--action-size-step" as keyof ReturnType<typeof getButtonSizeStyle>
      ];
    assert.equal(
      getAccentButtonDimensions(step).height,
      72 + Number(bounded) * 0.75,
    );
  }
  for (const radius of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(
      getAccentButtonDimensions(3, radius),
      getAccentButtonDimensions(3),
    );
    assert.deepEqual(getAccentRadiusStyle(radius), getAccentRadiusStyle());
  }
  assert.equal(getAccentButtonDimensions(0, -1).radius, 0);
  assert.deepEqual(BUTTON_SYSTEM, before);
});
