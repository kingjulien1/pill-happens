/**
 * The interface palette and its semantic roles. Medication artwork keeps its
 * own selectable colors; application surfaces, copy and effects start here.
 * Regenerate theme.css with `npm run theme:generate` after changing a role.
 */
export const APP_PALETTE = [
  {
    id: "peach",
    name: "Peach",
    hex: "#fed7aa",
    role: "Our warm replacement for white.",
  },
  {
    id: "flame",
    name: "Flame",
    hex: "#f97316",
    role: "Bright energy for actions, edges and light.",
  },
  {
    id: "rust",
    name: "Rust",
    hex: "#9a3412",
    role: "A grounded orange for depth and emphasis.",
  },
  {
    id: "ink",
    name: "Ink",
    hex: "#2a0f0a",
    role: "Our warm replacement for black.",
  },
  {
    id: "violet",
    name: "Violet",
    hex: "#623cea",
    role: "A playful counterpoint to the warm colors.",
  },
] as const;

export type AppPaletteId = (typeof APP_PALETTE)[number]["id"];
export type AppThemeMode = "light" | "dark";
export type AppThemeHex = `#${string}`;

export const APP_COLORS = {
  peach: APP_PALETTE[0].hex,
  flame: APP_PALETTE[1].hex,
  rust: APP_PALETTE[2].hex,
  ink: APP_PALETTE[3].hex,
  violet: APP_PALETTE[4].hex,
} as const satisfies Record<AppPaletteId, AppThemeHex>;

/** An sRGB mixture, always between palette colors; no white or black is added. */
export function mixAppColors(
  first: AppThemeHex,
  second: AppThemeHex,
  firstAmount: number,
): AppThemeHex {
  const amount = Math.max(0, Math.min(1, firstAmount));
  const channels = [1, 3, 5].map((offset) =>
    Math.round(
      parseInt(first.slice(offset, offset + 2), 16) * amount +
        parseInt(second.slice(offset, offset + 2), 16) * (1 - amount),
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

export function withAppAlpha(color: AppThemeHex, opacity: number): AppThemeHex {
  return `#${color.slice(1, 7)}${Math.round(
    Math.max(0, Math.min(1, opacity)) * 255,
  )
    .toString(16)
    .padStart(2, "0")}`;
}

export const APP_THEME_GROUPS = [
  {
    id: "surfaces",
    label: "Surfaces & Reading",
    description: "Paired layers and their readable text colors.",
  },
  {
    id: "actions",
    label: "Actions & Selection",
    description: "Buttons, selected items and their text.",
  },
  {
    id: "edges",
    label: "Edges & Focus",
    description: "Input boundaries, dividers and keyboard focus.",
  },
  {
    id: "glass",
    label: "Glass & Light",
    description: "Translucent washes, soft shadows and glowing edges.",
  },
  {
    id: "ambient",
    label: "Moving Background",
    description: "The same five colors, with a dark center in both modes.",
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Distinct status treatments with readable copy.",
  },
] as const;

export type AppThemeGroupId = (typeof APP_THEME_GROUPS)[number]["id"];

function role<const Id extends string>(
  group: AppThemeGroupId,
  id: Id,
  label: string,
  description: string,
  light: AppThemeHex,
  dark: AppThemeHex,
  pairsWith: readonly string[] = [],
) {
  return {
    id,
    group,
    label,
    token: `--${id}`,
    description,
    pairsWith,
    light,
    dark,
  } as const;
}

const { peach, flame, rust, ink, violet } = APP_COLORS;
const blend = mixAppColors;
const alpha = withAppAlpha;

export const APP_THEME_TOKENS = [
  role(
    "surfaces",
    "background",
    "Page Base",
    "Slightly shaded Peach in light mode; Ink in dark mode.",
    blend(peach, ink, 0.95),
    ink,
    ["foreground"],
  ),
  role(
    "surfaces",
    "foreground",
    "Primary Copy",
    "The highest priority text: Ink on light surfaces, Peach on dark surfaces.",
    ink,
    peach,
    ["background", "card", "popover"],
  ),
  role(
    "surfaces",
    "card",
    "Card",
    "A solid, readable base beneath translucent component effects.",
    blend(peach, ink, 0.98),
    blend(ink, rust, 0.94),
    ["card-foreground"],
  ),
  role(
    "surfaces",
    "card-foreground",
    "Card Copy",
    "Primary text for medication, journal and information cards.",
    ink,
    peach,
    ["card"],
  ),
  role(
    "surfaces",
    "popover",
    "Popover",
    "An opaque base for menus and dialogs above the moving background.",
    peach,
    blend(ink, peach, 0.94),
    ["popover-foreground"],
  ),
  role(
    "surfaces",
    "popover-foreground",
    "Popover Copy",
    "Readable menu and dialog text.",
    ink,
    peach,
    ["popover"],
  ),
  role(
    "surfaces",
    "muted",
    "Quiet Surface",
    "A softened layer for secondary blocks and controls.",
    blend(peach, ink, 0.88),
    blend(ink, peach, 0.92),
    ["muted-foreground"],
  ),
  role(
    "surfaces",
    "muted-foreground",
    "Secondary Copy",
    "Opaque palette-derived secondary copy; readable on quiet surfaces.",
    blend(ink, peach, 0.82),
    blend(peach, ink, 0.72),
    ["muted", "background", "card"],
  ),
  role(
    "surfaces",
    "surface-raised",
    "Raised Surface",
    "The brightest light surface and a softly lifted dark layer.",
    peach,
    blend(ink, peach, 0.89),
    ["surface-raised-foreground"],
  ),
  role(
    "surfaces",
    "surface-raised-foreground",
    "Raised Copy",
    "Text on raised panels, menus and previews.",
    ink,
    peach,
    ["surface-raised"],
  ),
  role(
    "surfaces",
    "surface-sunken",
    "Inset Surface",
    "A deeper resting place for inputs and nested content.",
    blend(peach, ink, 0.84),
    ink,
    ["surface-sunken-foreground"],
  ),
  role(
    "surfaces",
    "surface-sunken-foreground",
    "Inset Copy",
    "Primary copy inside recessed controls.",
    ink,
    peach,
    ["surface-sunken"],
  ),
  role(
    "surfaces",
    "surface-inverse",
    "Inverse Surface",
    "Ink and Peach exchange roles for prominent contrast.",
    ink,
    peach,
    ["surface-inverse-foreground"],
  ),
  role(
    "surfaces",
    "surface-inverse-foreground",
    "Inverse Copy",
    "Text that belongs on the inverse surface.",
    peach,
    ink,
    ["surface-inverse"],
  ),
  role(
    "surfaces",
    "surface-reading",
    "Reading Surface",
    "A dependable solid backplate for longer copy over the animated field.",
    blend(peach, ink, 0.97),
    blend(ink, peach, 0.97),
    ["surface-reading-foreground"],
  ),
  role(
    "surfaces",
    "surface-reading-foreground",
    "Reading Copy",
    "Unsoftened text for longer descriptions and guidance.",
    ink,
    peach,
    ["surface-reading"],
  ),
  role(
    "surfaces",
    "canvas-foreground",
    "Canvas Copy",
    "Peach copy sits directly on the dark animated field in either system mode.",
    peach,
    peach,
    ["ambient-center"],
  ),
  role(
    "surfaces",
    "canvas-muted-foreground",
    "Secondary Canvas Copy",
    "Peach at 88% opacity keeps secondary labels readable on the dark animated field.",
    alpha(peach, 0.88),
    alpha(peach, 0.88),
    ["ambient-center"],
  ),
  role(
    "actions",
    "primary",
    "Primary Emphasis",
    "Solid Ink or Peach emphasis for progress and compact supporting controls.",
    ink,
    peach,
    ["primary-foreground"],
  ),
  role(
    "actions",
    "primary-foreground",
    "Primary Emphasis Copy",
    "Contrasting text when primary emphasis is used as a filled surface.",
    peach,
    ink,
    ["primary"],
  ),
  role(
    "actions",
    "action-background",
    "Filled Action",
    "Shared primary controls keep a warm Peach fill. The intake button uses its own layered gradient.",
    peach,
    peach,
    ["action-foreground"],
  ),
  role(
    "actions",
    "action-foreground",
    "Filled Action Copy",
    "Ink copy stays crisp on Peach action buttons.",
    ink,
    ink,
    ["action-background"],
  ),
  role(
    "actions",
    "secondary",
    "Secondary Action",
    "A quiet filled control below the primary action.",
    blend(peach, ink, 0.86),
    blend(ink, peach, 0.88),
    ["secondary-foreground"],
  ),
  role(
    "actions",
    "secondary-foreground",
    "Secondary Action Copy",
    "Text on secondary buttons and segmented controls.",
    ink,
    peach,
    ["secondary"],
  ),
  role(
    "actions",
    "accent",
    "Selected Surface",
    "A subtle palette-derived highlight for active menu items.",
    blend(peach, rust, 0.8),
    blend(ink, flame, 0.84),
    ["accent-foreground"],
  ),
  role(
    "actions",
    "accent-foreground",
    "Selected Copy",
    "Primary copy remains strong inside a selected item.",
    ink,
    peach,
    ["accent"],
  ),
  role(
    "actions",
    "selection",
    "Text Selection",
    "A translucent Flame wash for selected text.",
    alpha(flame, 0.3),
    alpha(flame, 0.4),
  ),
  role(
    "edges",
    "border",
    "Divider",
    "A subdued Ink or Peach edge for ordinary containers.",
    alpha(ink, 0.24),
    alpha(peach, 0.23),
  ),
  role(
    "edges",
    "input",
    "Input Edge",
    "Stronger boundaries make text fields easy to distinguish.",
    alpha(ink, 0.5),
    alpha(peach, 0.45),
  ),
  role(
    "edges",
    "ring",
    "Keyboard Focus",
    "Violet on light surfaces and Peach on dark surfaces make keyboard focus clear.",
    violet,
    peach,
  ),
  role(
    "edges",
    "ink",
    "Canonical Ink",
    "The darkest interface color, independent of system mode.",
    ink,
    ink,
  ),
  role(
    "glass",
    "glass-background",
    "Glass Wash",
    "A Peach light wash or Ink dark wash over blurred backdrops.",
    alpha(peach, 0.6),
    alpha(ink, 0.62),
  ),
  role(
    "glass",
    "glass-border",
    "Glass Edge",
    "A lightly contrasting edge for translucent surfaces.",
    alpha(ink, 0.16),
    alpha(peach, 0.24),
  ),
  role(
    "glass",
    "shadow",
    "Soft Shadow",
    "Ink supplies all neutral shadows without introducing black.",
    alpha(ink, 0.22),
    alpha(ink, 0.5),
  ),
  role(
    "glass",
    "glow",
    "Warm Glow",
    "Flame adds a warm halo without changing the base palette.",
    alpha(flame, 0.38),
    alpha(flame, 0.5),
  ),
  role(
    "glass",
    "empty-intake-wash",
    "Empty Card Glass",
    "A readable Peach glass base in light mode and a subtle wash in dark mode.",
    alpha(peach, 0.78),
    alpha(peach, 0.05),
  ),
  role(
    "glass",
    "empty-intake-hover",
    "Empty Card Hover",
    "A little more glass brightness on supported desktop hover.",
    alpha(peach, 0.86),
    alpha(peach, 0.08),
  ),
  role(
    "glass",
    "empty-intake-copy",
    "Empty Card Copy",
    "Readable copy that remains secondary to active entries.",
    alpha(ink, 0.84),
    alpha(peach, 0.84),
  ),
  role(
    "ambient",
    "ambient-overlay",
    "Background Veil",
    "A warm low-opacity veil; the saturated field remains visible.",
    alpha(peach, 0.12),
    alpha(ink, 0.16),
  ),
  role(
    "ambient",
    "ambient-center-scrim",
    "Center Anchor",
    "A stationary Ink fade keeps the center grounded while the field moves.",
    alpha(ink, 0.42),
    alpha(ink, 0.5),
  ),
  role(
    "ambient",
    "ambient-center",
    "Background Center",
    "A stable Ink center replaces the former white radial hotspot.",
    ink,
    ink,
  ),
  role(
    "ambient",
    "ambient-near",
    "Inner Warmth",
    "Rust surrounds the dark center.",
    rust,
    rust,
  ),
  role(
    "ambient",
    "ambient-mid",
    "Violet Current",
    "Violet interrupts the orange field with a playful ribbon.",
    violet,
    violet,
  ),
  role(
    "ambient",
    "ambient-far",
    "Outer Flame",
    "Saturated orange creates the moving outer wash.",
    flame,
    flame,
  ),
  role(
    "ambient",
    "ambient-edge",
    "Background Edge",
    "Peach is the brightest point in the radial field.",
    peach,
    peach,
  ),
  role(
    "feedback",
    "destructive",
    "Destructive Action",
    "Rust and Peach provide readable error or removal emphasis.",
    rust,
    blend(peach, flame, 0.88),
    ["destructive-foreground"],
  ),
  role(
    "feedback",
    "destructive-foreground",
    "Destructive Copy",
    "Contrasting copy for a destructive action fill.",
    peach,
    ink,
    ["destructive"],
  ),
  role(
    "feedback",
    "success",
    "Success Surface",
    "A warm restrained confirmation surface; its label also conveys success.",
    blend(peach, rust, 0.91),
    blend(ink, peach, 0.88),
    ["success-foreground"],
  ),
  role(
    "feedback",
    "success-foreground",
    "Success Copy",
    "Readable confirmation text using the same interface palette.",
    ink,
    peach,
    ["success"],
  ),
  role(
    "feedback",
    "warning",
    "Attention Surface",
    "Flame mixed with the current surface draws gentle attention.",
    blend(peach, flame, 0.68),
    blend(ink, flame, 0.82),
    ["warning-foreground"],
  ),
  role(
    "feedback",
    "warning-foreground",
    "Attention Copy",
    "Readable copy for warnings and contextual notices.",
    ink,
    peach,
    ["warning"],
  ),
  role(
    "feedback",
    "info",
    "Information Surface",
    "A modest Violet tint for neutral contextual information.",
    blend(peach, violet, 0.88),
    blend(ink, violet, 0.82),
    ["info-foreground"],
  ),
  role(
    "feedback",
    "info-foreground",
    "Information Copy",
    "Primary text on informational panels.",
    ink,
    peach,
    ["info"],
  ),
] as const;

export type AppThemeToken = (typeof APP_THEME_TOKENS)[number];
export type AppThemeTokenId = AppThemeToken["id"];

export const APP_THEME_VALUES = Object.fromEntries(
  (["light", "dark"] as const).map((mode) => [
    mode,
    Object.fromEntries(APP_THEME_TOKENS.map((item) => [item.id, item[mode]])),
  ]),
) as Record<AppThemeMode, Record<AppThemeTokenId, AppThemeHex>>;

/** CSS and the guide read the same registry, including every alpha byte. */
export function renderAppThemeCss() {
  const values = (mode: AppThemeMode, indent: string) =>
    APP_THEME_TOKENS.map(
      (item) => `${indent}${item.token}: ${item[mode]};`,
    ).join("\n");
  return `/* Generated from src/lib/app-theme.ts. Run npm run theme:generate. */
:root {
  color-scheme: light;
${APP_PALETTE.map((color) => `  --palette-${color.id}: ${color.hex};`).join("\n")}
${values("light", "  ")}
  --radius: 1rem;
  --medication-symbol-mix: 35%;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
${values("dark", "    ")}
    --medication-symbol-mix: 55%;
  }
}
`;
}

/** A radial ramp runs edge -> center in the GPU field. Never auto-lighten it. */
export const APP_BACKGROUND_COLORS = [peach, flame, violet, rust, ink];
