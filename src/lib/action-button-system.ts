import type { CSSProperties } from "react";
import { GUIDE_LAYOUT_BANDS } from "@/lib/guide-responsive";
import {
  APP_FOUNDATION,
  APP_HARMONY,
  APP_SECONDARY_COLOR,
  mixAppColors,
  type AppThemeHex,
} from "@/lib/app-theme";

/** A six-percent Rose admixture keeps the original button pigments recognizable. */
export const ACTION_BUTTON_ROSE_SHARE = 0.06;
export function mixActionButtonRose(color: AppThemeHex): AppThemeHex {
  const mixed = mixAppColors(
    color,
    APP_HARMONY.rose,
    1 - ACTION_BUTTON_ROSE_SHARE,
  );
  return color.length === 9 ? `${mixed}${color.slice(7)}` : mixed;
}

export const ACTION_BUTTON_KINDS = ["primary", "secondary", "accent"] as const;
export type ActionButtonKind = (typeof ACTION_BUTTON_KINDS)[number];
export type ActionButtonTheme = "light" | "dark";
/** Fixed card-derived proportions keep shared Accent corners independent of CTA sizing. */
export const ACTION_BUTTON_SHAPE_REFERENCE = {
  height: 80,
  radius: 21,
} as const;
export const ACCENT_RADIUS_RATIO =
  ACTION_BUTTON_SHAPE_REFERENCE.radius / ACTION_BUTTON_SHAPE_REFERENCE.height;
/** Today is slightly shorter while retaining the same rounded-rectangle proportions. */
export const INTAKE_ACTION_GEOMETRY = {
  height: 74,
  radius:
    (74 * ACTION_BUTTON_SHAPE_REFERENCE.radius) /
    ACTION_BUTTON_SHAPE_REFERENCE.height,
} as const;
const accentBaseHeight = 72;
const buttonHeightStep = 0.75;
/** A deliberate finish choice; neither appearance depends on a dropped layer. */
export const ACCENT_FINISHES = {
  field: {
    label: "Exposed field",
    description:
      "The charcoal field stays exposed beneath one thirteen-percent pink, rim-color and Pink500 reflection.",
    anchorOpacity: 0,
    washOpacity: 0,
  },
  glazed: {
    label: "Soft glaze",
    description:
      "An optional charcoal center glaze softens the same moving field beneath its shared pink reflection.",
    anchorOpacity: 0.72,
    washOpacity: 0.12,
  },
} as const;
export type AccentButtonFinish = keyof typeof ACCENT_FINISHES;
export type ActionButtonPaint = {
  base: string;
  fieldColors: readonly string[];
  fieldOpacity: number;
  diagonalColors: readonly string[];
  diagonalOpacity: number;
  washColor: string;
  washOpacity: number;
  rimColors: readonly string[];
  text: string;
  blur: number;
};

/** One charcoal face and mode-aware pink rim are shared by every filled action. */
const intakeActionField: ActionButtonPaint = {
  base: "#1d161e",
  fieldColors: ["#1d161e", "#302432", "#1d161e", "#241b2b"],
  fieldOpacity: 0.26,
  diagonalColors: ["#1d161e", "#241b2b"],
  diagonalOpacity: 0,
  washColor: "#1d161e",
  washOpacity: 0,
  rimColors: ["#f9a8d4", "#fbcfe8", "#f472b6"],
  text: APP_FOUNDATION.white,
  blur: 0,
};
export const INTAKE_ACTION_PAINT: Readonly<
  Record<ActionButtonTheme, ActionButtonPaint>
> = {
  light: intakeActionField,
  dark: {
    ...intakeActionField,
    rimColors: ["#fbcfe8", "#fce7f3", "#f472b6"],
  },
};

/** One composited pink tint layer; the legacy Emerald key stays compatible. */
export const ACTION_BUTTON_TINT = {
  opacity: 0.13,
  emerald: "var(--color-pink-500, oklch(65.6% 0.241 354.308))",
} as const;

/** Low-opacity pink reflections preserve the exact charcoal base. */
export const INTAKE_ACTION_SUPPORTING_PAINT = {
  "--intake-action-accent": "#f9a8d4",
  "--accent-field-haze": "#f9a8d406",
  "--accent-anchor-left": "#1d161e2e",
  "--accent-anchor-right": "#fbcfe814",
  "--accent-anchor-flash": "#fdf2f81a",
  "--accent-anchor-depth": "#1d161e0a",
  "--accent-aura-flame": "#f9a8d426",
  "--accent-aura-rust": "#f472b61f",
  "--accent-sheen-top": "#fbcfe83d",
  "--accent-sheen-bottom": "#0e0a1029",
  "--accent-shadow-soft": "#f9a8d421",
  "--accent-shadow-contact": "#0e0a104d",
  "--accent-hover-soft": "#f472b62e",
  "--accent-hover-contact": "#0e0a1059",
} as const;

/** Header branding uses the shared charcoal face and pink accent in both themes. */
export function getIntakeBrandStyle(): CSSProperties {
  return {
    "--brand-surface": INTAKE_ACTION_PAINT.light.base,
    "--brand-copy": INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
  } as CSSProperties;
}

/** Live branding uses every pink reflection of the CTA, in either appearance. */
export function getBrandThemeStyle(): CSSProperties {
  return {
    ...getIntakeBrandStyle(),
    "--brand-ink": INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
    "--brand-tone-ice": INTAKE_ACTION_PAINT.light.rimColors[1],
    "--brand-tone-teal": INTAKE_ACTION_PAINT.light.rimColors[2],
    "--brand-tone-pale": INTAKE_ACTION_PAINT.dark.rimColors[0],
    "--brand-tone-seafoam": INTAKE_ACTION_PAINT.dark.rimColors[2],
    "--brand-tone-emerald": ACTION_BUTTON_TINT.emerald,
  } as CSSProperties;
}

/** Small supporting paints remain explicit, inspectable and shared with the CSS. */
export const ACCENT_SUPPORTING_PAINT = [
  {
    id: "field-haze",
    label: "Field haze",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-field-haze"],
    layerOpacity: 1,
    placement: "A restrained pink haze above the rotating charcoal field.",
  },
  {
    id: "anchor-left",
    label: "Lower-left depth",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-anchor-left"],
    layerOpacity: 0.72,
    placement:
      "Optional glazed finish: charcoal depth in the lower-left radial pool.",
  },
  {
    id: "anchor-right",
    label: "Upper-right light",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-anchor-right"],
    layerOpacity: 0.72,
    placement:
      "Optional glazed finish: a light pink reflection in the upper-right radial pool.",
  },
  {
    id: "anchor-flash",
    label: "Center reflection",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-anchor-flash"],
    layerOpacity: 0.72,
    placement:
      "Optional glazed finish: a pale pink stop in the stationary center reflection.",
  },
  {
    id: "anchor-depth",
    label: "Center depth",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-anchor-depth"],
    layerOpacity: 0.72,
    placement:
      "Optional glazed finish: a charcoal stop in the stationary center reflection.",
  },
  {
    id: "aura-flame",
    label: "Pink aura",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-aura-flame"],
    layerOpacity: 0.55,
    placement: "A 7px-blurred Pink ellipse inside a 55%-opacity aura.",
  },
  {
    id: "aura-rust",
    label: "Aura depth",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-aura-rust"],
    layerOpacity: 0.55,
    placement: "A second low-opacity Pink ellipse inside the same aura.",
  },
  {
    id: "sheen-top",
    label: "Top reflection",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-sheen-top"],
    layerOpacity: 1,
    placement: "A pale pink 1px inset highlight above the face.",
  },
  {
    id: "sheen-bottom",
    label: "Bottom reflection",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-sheen-bottom"],
    layerOpacity: 1,
    placement: "A charcoal 1px inset depth line above the face.",
  },
  {
    id: "shadow-soft",
    label: "Soft shadow",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-shadow-soft"],
    layerOpacity: 1,
    placement: "A soft Pink supporting shadow at 0 5px 18px.",
  },
  {
    id: "shadow-contact",
    label: "Contact shadow",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-shadow-contact"],
    layerOpacity: 1,
    placement: "A charcoal contact shadow at 0 1px 3px.",
  },
  {
    id: "hover-soft",
    label: "Hovered soft shadow",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-hover-soft"],
    layerOpacity: 1,
    placement: "A soft Pink hover reflection at 0 6px 22px.",
  },
  {
    id: "hover-contact",
    label: "Hovered contact shadow",
    color: INTAKE_ACTION_SUPPORTING_PAINT["--accent-hover-contact"],
    layerOpacity: 1,
    placement: "A charcoal hover contact shadow at 0 2px 5px.",
  },
] as const;

/** Existing journal artwork keeps its own pigments when action paint changes. */
const journalSymbolPaint: ActionButtonPaint = {
  base: mixActionButtonRose(APP_FOUNDATION.plum),
  fieldColors: [
    mixActionButtonRose("#49385e"),
    mixActionButtonRose("#2b233e"),
    mixActionButtonRose("#675278"),
    mixActionButtonRose("#332a48"),
  ],
  fieldOpacity: 1,
  diagonalColors: [
    mixActionButtonRose("#49385e"),
    mixActionButtonRose("#332a48"),
  ],
  diagonalOpacity: 0,
  washColor: mixActionButtonRose("#2b233e"),
  washOpacity: 0,
  rimColors: [
    mixActionButtonRose("#b7a4e5"),
    mixActionButtonRose("#2b233e"),
    APP_SECONDARY_COLOR,
  ],
  text: APP_FOUNDATION.white,
  blur: 0,
};

export function getJournalSymbolPaintStyle(): CSSProperties {
  const result: Record<string, string | number> = {
    "--accent-field-haze": mixActionButtonRose("#b7a4e526"),
    "--accent-sheen-top": mixActionButtonRose("#ffffff66"),
    "--accent-sheen-bottom": mixActionButtonRose("#2b233e29"),
  };
  for (const mode of ["light", "dark"] as const)
    writeButtonPaintStyle(result, mode, journalSymbolPaint);
  return result as CSSProperties;
}

/** Shared paint values drive the real buttons and the developer reference. */
export const BUTTON_SYSTEM = {
  primary: {
    label: "Primary",
    description:
      "The page’s main invitation: a luminous layered glass face with a constant-width specular rim.",
    useFor:
      "The main Log Intake action and the single strongest next step on a page.",
    avoidFor:
      "Repeating beside every row, dismissing a dialog, or destructive actions.",
    height: 62,
    fontSize: 15,
    padding: 19,
    radius: 22,
    themes: INTAKE_ACTION_PAINT,
  },
  secondary: {
    label: "Secondary",
    description:
      "A quieter tonal glass companion, sharing the primary’s crisp moving edge and familiar shape.",
    useFor:
      "A supporting choice, reviewing details, or an alternate route beside a stronger action.",
    avoidFor:
      "Competing with the primary action or signalling deletion through color alone.",
    height: 48,
    fontSize: 14,
    padding: 16,
    radius: 16,
    themes: INTAKE_ACTION_PAINT,
  },
  accent: {
    label: "Accent",
    description:
      "A charcoal rotating field with one thirteen-percent pink reflection and a separate fine inset pink rim.",
    useFor:
      "Committing a completed form, adding a medication, and a deliberate moment of emphasis.",
    avoidFor:
      "Every toolbar control, low-priority navigation, or busy repeated lists.",
    height: accentBaseHeight,
    fontSize: 14.25,
    padding: 16,
    radius:
      (accentBaseHeight * ACTION_BUTTON_SHAPE_REFERENCE.radius) /
      ACTION_BUTTON_SHAPE_REFERENCE.height,
    themes: INTAKE_ACTION_PAINT,
  },
} as const;

/** Keep both theme aliases aligned with the explicitly selected Accent finish. */
export function getAccentFinishStyle(
  finish: AccentButtonFinish = "field",
): CSSProperties {
  const paint = ACCENT_FINISHES[finish];
  return {
    "--action-light-diagonal-opacity": paint.anchorOpacity,
    "--action-dark-diagonal-opacity": paint.anchorOpacity,
    "--action-light-wash-opacity": paint.washOpacity,
    "--action-dark-wash-opacity": paint.washOpacity,
  } as CSSProperties;
}

export const BUTTON_SIZE_BANDS = GUIDE_LAYOUT_BANDS.map((band, index) => {
  const step = Math.min(index, 5);
  return {
    name: band.name,
    token: band.token,
    min: band.min,
    step,
    heightIncrement: step * buttonHeightStep,
    fontIncrement: step * 0.125,
    paddingIncrement: step * 0.5,
    capped: index >= 6,
  };
});

/** Explicit samples use the same size step as the matching viewport rule. */
export function getButtonSizeStyle(step: number): CSSProperties {
  return {
    "--action-size-step": buttonSizeStep(step),
  } as CSSProperties;
}

function buttonSizeStep(step: number) {
  return Math.min(5, Math.max(0, Number.isFinite(step) ? step : 0));
}

function explicitAccentRadius(radius?: number) {
  return typeof radius === "number" && Number.isFinite(radius)
    ? Math.max(0, radius)
    : null;
}

/** Numeric companions let examples describe the same responsive geometry. */
export function getAccentButtonDimensions(step = 0, radius?: number) {
  const height =
    BUTTON_SYSTEM.accent.height + buttonSizeStep(step) * buttonHeightStep;
  return {
    height,
    radius:
      explicitAccentRadius(radius) ??
      (height * ACTION_BUTTON_SHAPE_REFERENCE.radius) /
        ACTION_BUTTON_SHAPE_REFERENCE.height,
  };
}

/** Accent owns its proportional shape rather than inheriting a dialog-shell curve. */
export function getAccentRadiusStyle(radius?: number): CSSProperties {
  const explicit = explicitAccentRadius(radius);
  const corner =
    explicit === null
      ? `calc((var(--action-base-height, ${BUTTON_SYSTEM.accent.height}px) + var(--action-size-step, 0) * ${buttonHeightStep}px) * ${ACCENT_RADIUS_RATIO})`
      : `${explicit}px`;
  return {
    borderRadius: corner,
    "--accent-radius": corner,
  } as CSSProperties;
}

/** Define both modes before paint; CSS selects the system or explicit preview. */
export function getButtonThemeStyle(
  kind: ActionButtonKind,
  theme?: ActionButtonTheme,
  paintKind: ActionButtonKind = kind,
): CSSProperties {
  const button = BUTTON_SYSTEM[kind];
  const result: Record<string, string | number> = {
    "--action-base-height": `${button.height}px`,
    "--action-base-font": `${button.fontSize}px`,
    "--action-base-padding": `${button.padding}px`,
  };
  if (theme) result.colorScheme = theme;
  Object.assign(result, INTAKE_ACTION_SUPPORTING_PAINT, {
    "--action-tint-opacity": ACTION_BUTTON_TINT.opacity,
    "--action-tint-emerald": ACTION_BUTTON_TINT.emerald,
  });
  for (const mode of ["light", "dark"] as const) {
    const paint = BUTTON_SYSTEM[paintKind].themes[mode];
    writeButtonPaintStyle(result, mode, paint);
  }
  return result as CSSProperties;
}

/** One map feeds the CSS face, fallback ring and live shader’s computed stops. */
function writeButtonPaintStyle(
  result: Record<string, string | number>,
  mode: ActionButtonTheme,
  paint: ActionButtonPaint,
) {
  const prefix = `--action-${mode}-`;
  result[prefix + "base"] = paint.base;
  result[prefix + "field-opacity"] = paint.fieldOpacity;
  paint.fieldColors.forEach((color, index) => {
    result[prefix + `field-${index + 1}`] = color;
  });
  result[prefix + "field-4"] ??= paint.fieldColors[0];
  paint.diagonalColors.forEach((color, index) => {
    result[prefix + `diagonal-${index + 1}`] = color;
  });
  result[prefix + "diagonal-opacity"] = paint.diagonalOpacity;
  result[prefix + "wash"] = paint.washColor;
  result[prefix + "wash-opacity"] = paint.washOpacity;
  result[prefix + "text"] = paint.text;
  result[prefix + "blur"] = `${paint.blur}px`;
  paint.rimColors.forEach((color, index) => {
    result[prefix + `rim-${index + 1}`] = color;
  });
}

/** Supplies Today’s shared foreground/glow tokens; its solid face is styled locally. */
export function getIntakeActionThemeStyle(
  theme?: ActionButtonTheme,
): CSSProperties {
  return getButtonThemeStyle("primary", theme, "accent");
}
