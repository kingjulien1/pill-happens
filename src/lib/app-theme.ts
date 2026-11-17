/**
 * The interface palette and its semantic roles. Medication artwork keeps its
 * own selectable colors; application surfaces, copy and effects start here.
 * Regenerate theme.css with `npm run theme:generate` after changing a role.
 */
export const APP_FOUNDATION = {
  plum: "#2b233e",
  lilac: "#b7a4e5",
  apricot: "#f2b88f",
  black: "#111014",
  white: "#ffffff",
} as const;

/** Fuchsia900 replaces the former warm secondary in actions and check-in artwork. */
export const APP_SECONDARY_COLOR = "#701a75";

/** Related check-in pigments enrich reflections without replacing the foundation. */
export const APP_HARMONY = {
  rose: "#f9a8d4",
  iris: "#b7c9f5",
  mint: "#a7e4cf",
} as const;

/** Legacy ids remain stable for saved guide links and existing component imports. */
export const APP_PALETTE = [
  {
    id: "peach",
    name: "White",
    hex: APP_FOUNDATION.white,
    role: "Bright icon details and clear copy on dark Plum; daylight panels use Rose/Lilac paper.",
  },
  {
    id: "flame",
    name: "Apricot",
    hex: APP_FOUNDATION.apricot,
    role: "Warm surface and atmospheric detail; Fuchsia supplies action emphasis.",
  },
  {
    id: "rust",
    name: "Plum",
    hex: APP_FOUNDATION.plum,
    role: "The shared foundation for cards, dialogs and the dark canvas.",
  },
  {
    id: "ink",
    name: "Black",
    hex: APP_FOUNDATION.black,
    role: "Neutral depth and readable copy on light surfaces.",
  },
  {
    id: "violet",
    name: "Lilac",
    hex: APP_FOUNDATION.lilac,
    role: "A softer expression of Plum for highlights, edges and light surfaces.",
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

/** An sRGB mixture of two foundation colors, including neutral White and Black. */
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

/** Stable opaque foundation beneath the live shader and static fallback paint. */
export const APP_CANVAS_BASE = mixAppColors(
  APP_FOUNDATION.plum,
  APP_FOUNDATION.black,
  0.92,
);
export const APP_CANVAS_FOREGROUND = "#ffffff";
export const APP_CANVAS_MUTED_FOREGROUND = "#ded8ec";

/** Shared rendering settings for the noninteractive React Bits Iridescence field. */
export const APP_IRIDESCENCE = Object.freeze({
  color: "#7c3aed",
  colorRgb: Object.freeze([124 / 255, 58 / 255, 237 / 255] as const),
  speed: 0.92,
  amplitude: 0.1,
  scale: 1,
  detail: 8,
  rotation: 0,
  warp: 1,
  hueShift: 0,
  saturation: 1,
  brightness: 1.5,
  contrast: 1,
  grain: 0,
  fade: 0,
  opacity: 1,
  mouseReact: false,
  clickSwirl: false,
  blur: 4,
  pinkOpacity: 0.21,
  purpleOpacity: 0.69,
});

/** CSS backgrounds list the uppermost Purple900 wash before the Pink300 wash. */
export const APP_CANVAS_OVERLAY = [
  `linear-gradient(oklch(38.1% 0.176 304.987 / ${APP_IRIDESCENCE.purpleOpacity}) 0 0)`,
  `linear-gradient(oklch(82.3% 0.12 346.018 / ${APP_IRIDESCENCE.pinkOpacity}) 0 0)`,
].join(", ");

/** A smooth violet still keeps critical, offline and unsupported-WebGL views coherent. */
export const APP_CANVAS_BACKGROUND = [
  APP_CANVAS_OVERLAY,
  "radial-gradient(ellipse at 42% 36%, #7c3aed 0%, #5829a2 42%, #332047 82%, #29213b 100%)",
  APP_CANVAS_BASE,
].join(", ");
export const APP_CANVAS_CSS = `
  --app-canvas-base: ${APP_CANVAS_BASE};
  --app-canvas-background: ${APP_CANVAS_BACKGROUND};
  --app-canvas-overlay: ${APP_CANVAS_OVERLAY};
  --app-iridescence-color: ${APP_IRIDESCENCE.color};
  --app-iridescence-blur: ${APP_IRIDESCENCE.blur}px;
  --app-canvas-foreground: ${APP_CANVAS_FOREGROUND};
  --app-canvas-muted-foreground: ${APP_CANVAS_MUTED_FOREGROUND};
`;

export const APP_THEME_GROUPS = [
  {
    id: "surfaces",
    label: "Surfaces & Reading",
    description: "Paired layers and their readable text colors.",
  },
  {
    id: "menus",
    label: "Rose & Indigo Menus",
    description:
      "Rose/Lilac daylight menus, deep Indigo dark menus, readable copy and distinct interaction states.",
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
    id: "harmony",
    label: "Rose, Iris & Mint",
    description:
      "Check-in-inspired reflections, feature surfaces and fine details enrich the shared Plum family.",
  },
  {
    id: "ambient",
    label: "Optional Gradient Pigments",
    description:
      "Legacy Grainient pigments remain available for optional examples; the page canvas uses a separate violet Iridescence field and its own static fallback.",
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

const { plum, lilac, apricot, black, white } = APP_FOUNDATION;
const { rose, iris, mint } = APP_HARMONY;
const blend = mixAppColors;
const alpha = withAppAlpha;
const rosePlum = blend(plum, rose, 0.94);
const roseLilac = blend(lilac, rose, 0.93);
const roseApricot = blend(apricot, rose, 0.94);

/**
 * Rose/Lilac paper tiers for daylight. These are opaque so small copy, nested
 * fields and stacked cards never inherit the violet canvas's moving contrast.
 * The dark palette and the shared Iridescence canvas remain independent.
 */
const lightPigment = blend(rose, lilac, 0.52);
export const APP_LIGHT_SURFACES = Object.freeze({
  foundation: blend(white, lightPigment, 0.64),
  card: blend(white, lightPigment, 0.76),
  floating: blend(white, lightPigment, 0.85),
  raised: blend(white, rose, 0.81),
  inset: blend(white, lightPigment, 0.48),
  reading: blend(white, lightPigment, 0.8),
  quiet: blend(white, blend(lilac, rose, 0.68), 0.6),
  selected: blend(white, lightPigment, 0.43),
  ink: blend(plum, APP_SECONDARY_COLOR, 0.9),
  secondaryInk: blend(plum, rose, 0.79),
});

// Dense Plum glass preserves readable text over every moving background stop.
const darkSurface = (color: AppThemeHex) => alpha(color, 0.94);

export const APP_THEME_TOKENS = [
  role(
    "surfaces",
    "background",
    "Foundation Surface",
    "Mode-aware foundation for controls and layered surfaces; the visible page uses canvas-background.",
    APP_LIGHT_SURFACES.foundation,
    plum,
    ["foreground"],
  ),
  role(
    "surfaces",
    "foreground",
    "Primary Copy",
    "Rich Plum-Fuchsia ink on Rose/Lilac daylight paper; White on dark Plum.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["background", "card", "popover"],
  ),
  role(
    "surfaces",
    "card",
    "Card",
    "Opaque Rose/Lilac daylight paper and gently Rose-inflected Plum keep stacked cards crisp in both modes.",
    APP_LIGHT_SURFACES.card,
    blend(rosePlum, black, 0.96),
    ["card-foreground"],
  ),
  role(
    "surfaces",
    "card-foreground",
    "Card Copy",
    "Shared primary text for medication, journal and information cards.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["card"],
  ),
  role(
    "surfaces",
    "popover",
    "Popover",
    "Opaque light paper and Plum surfaces keep dialogs and general popovers readable over page text.",
    APP_LIGHT_SURFACES.floating,
    blend(rosePlum, white, 0.96),
    ["popover-foreground"],
  ),
  role(
    "surfaces",
    "popover-foreground",
    "Popover Copy",
    "Clear dialog and general popover text in the same neutral copy colors.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["popover"],
  ),
  role(
    "surfaces",
    "muted",
    "Quiet Surface",
    "Lilac with a small Rose inflection gives secondary sections a quiet sense of depth.",
    APP_LIGHT_SURFACES.quiet,
    darkSurface(blend(rosePlum, roseLilac, 0.91)),
    ["muted-foreground"],
  ),
  role(
    "surfaces",
    "muted-foreground",
    "Secondary Copy",
    "Opaque, lower-emphasis copy keeps normal-size labels above 4.5:1 contrast.",
    APP_LIGHT_SURFACES.secondaryInk,
    blend(white, lilac, 0.58),
    ["muted", "background", "card"],
  ),
  role(
    "surfaces",
    "surface-raised",
    "Raised Surface",
    "Soft Pink paper lifts daylight panels; a softly lightened Plum lifts dark panels.",
    APP_LIGHT_SURFACES.raised,
    darkSurface(blend(rosePlum, white, 0.9)),
    ["surface-raised-foreground"],
  ),
  role(
    "surfaces",
    "surface-raised-foreground",
    "Raised Copy",
    "Neutral primary text on raised panels and previews.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["surface-raised"],
  ),
  role(
    "surfaces",
    "surface-sunken",
    "Inset Surface",
    "A Lilac inset in light mode and a deeper Plum inset in dark mode.",
    APP_LIGHT_SURFACES.inset,
    darkSurface(blend(rosePlum, black, 0.78)),
    ["surface-sunken-foreground"],
  ),
  role(
    "surfaces",
    "surface-sunken-foreground",
    "Inset Copy",
    "Primary copy inside recessed controls.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["surface-sunken"],
  ),
  role(
    "surfaces",
    "surface-inverse",
    "Inverse Surface",
    "Black and White exchange roles for an occasional high-contrast panel.",
    black,
    white,
    ["surface-inverse-foreground"],
  ),
  role(
    "surfaces",
    "surface-inverse-foreground",
    "Inverse Copy",
    "The neutral counterpart for text on an inverse surface.",
    white,
    black,
    ["surface-inverse"],
  ),
  role(
    "surfaces",
    "surface-reading",
    "Reading Surface",
    "Rose/Lilac reading paper or dense Plum glass supports long-form reading without glare.",
    APP_LIGHT_SURFACES.reading,
    darkSurface(blend(rosePlum, black, 0.95)),
    ["surface-reading-foreground"],
  ),
  role(
    "surfaces",
    "surface-reading-foreground",
    "Reading Copy",
    "Opaque neutral text for longer descriptions and journal pages.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["surface-reading"],
  ),
  role(
    "surfaces",
    "canvas-background",
    "Page Canvas",
    "Opaque deeper Plum foundation beneath the violet Iridescence field, lightly blurred before Pink300 at 21% and Purple900 at 69% in both modes. Critical and offline views use a matching static violet fallback.",
    APP_CANVAS_BASE,
    APP_CANVAS_BASE,
    ["canvas-foreground", "canvas-muted-foreground"],
  ),
  role(
    "surfaces",
    "canvas-foreground",
    "Canvas Copy",
    "Opaque light copy on the shared violet page canvas in either appearance.",
    APP_CANVAS_FOREGROUND,
    APP_CANVAS_FOREGROUND,
    ["canvas-background"],
  ),
  role(
    "surfaces",
    "canvas-muted-foreground",
    "Secondary Canvas Copy",
    "A readable pale Lilac counterpart for secondary copy on the violet page canvas.",
    APP_CANVAS_MUTED_FOREGROUND,
    APP_CANVAS_MUTED_FOREGROUND,
    ["canvas-background"],
  ),
  role(
    "menus",
    "menu-surface",
    "Indigo Menu",
    "Opaque Lilac paper in light mode and Indigo 950 (#1e1b4b) mixed with Plum in dark mode; dropdowns retain their own surface family.",
    blend(APP_LIGHT_SURFACES.floating, lilac, 0.88),
    blend("#221d47", rose, 0.97),
    [
      "menu-foreground",
      "menu-muted-foreground",
      "menu-edge",
      "menu-inset-edge",
    ],
  ),
  role(
    "menus",
    "menu-foreground",
    "Menu Copy",
    "Deep Indigo copy on light menu paper and nearly White copy on dark Indigo remain readable in every menu state.",
    APP_LIGHT_SURFACES.ink,
    "#fbfafd",
    ["menu-surface", "menu-hover", "menu-selected", "menu-selected-focus"],
  ),
  role(
    "menus",
    "menu-muted-foreground",
    "Secondary Menu Copy",
    "Opaque muted copy keeps descriptions, counts and secondary labels above 4.5:1 contrast, including selected and focused rows.",
    APP_LIGHT_SURFACES.secondaryInk,
    "#d8d3ed",
    ["menu-surface", "menu-hover", "menu-selected", "menu-selected-focus"],
  ),
  role(
    "menus",
    "menu-edge",
    "Menu Outer Edge",
    "A quiet, neutralized Indigo boundary defines the outside of a dropdown without outlining each item.",
    blend(APP_LIGHT_SURFACES.inset, lilac, 0.62),
    blend("#514b69", rose, 0.96),
    ["menu-surface", "menu-inset-edge"],
  ),
  role(
    "menus",
    "menu-inset-edge",
    "Menu Inward Edge",
    "An opaque soft inner edge adds restrained depth inside the menu perimeter.",
    APP_LIGHT_SURFACES.floating,
    blend("#37304f", rose, 0.97),
    ["menu-surface", "menu-edge"],
  ),
  role(
    "menus",
    "menu-hover",
    "Menu Hover",
    "A gentle Indigo tint identifies the hovered or keyboard-highlighted item.",
    blend(APP_LIGHT_SURFACES.inset, lilac, 0.9),
    blend("#332c5d", rose, 0.97),
    ["menu-foreground", "menu-muted-foreground"],
  ),
  role(
    "menus",
    "menu-selected",
    "Menu Selection",
    "A stronger Indigo surface marks the current choice while medication and category colors retain their meaning.",
    blend(APP_LIGHT_SURFACES.selected, lilac, 0.84),
    blend("#413676", rose, 0.97),
    ["menu-foreground", "menu-muted-foreground"],
  ),
  role(
    "menus",
    "menu-selected-focus",
    "Focused Menu Selection",
    "The deepest light tint or brightest dark Indigo distinguishes a hovered or keyboard-highlighted current choice.",
    blend(APP_LIGHT_SURFACES.selected, lilac, 0.66),
    blend("#4c4088", rose, 0.97),
    ["menu-foreground", "menu-muted-foreground", "menu-focus-ring"],
  ),
  role(
    "menus",
    "menu-focus-ring",
    "Menu Keyboard Focus",
    "Indigo 900 (#312e81) or Lilac provides at least 3:1 contrast against every menu state where a keyboard outline is needed.",
    "#701a75",
    lilac,
    ["menu-surface", "menu-hover", "menu-selected", "menu-selected-focus"],
  ),
  role(
    "actions",
    "primary",
    "Primary Emphasis",
    "Fuchsia emphasizes compact daylight controls; Rose-inflected Lilac supplies dark-mode emphasis.",
    APP_SECONDARY_COLOR,
    roseLilac,
    ["primary-foreground"],
  ),
  role(
    "actions",
    "primary-foreground",
    "Primary Emphasis Copy",
    "White on Fuchsia and Black on Lilac keep primary controls readable.",
    white,
    black,
    ["primary"],
  ),
  role(
    "actions",
    "action-background",
    "Filled Action",
    "Retained Fuchsia900 compatibility pigment for check-in and decorative surfaces; filled action components supply their own charcoal/mint paint.",
    APP_SECONDARY_COLOR,
    APP_SECONDARY_COLOR,
    ["action-foreground"],
  ),
  role(
    "actions",
    "action-foreground",
    "Filled Action Copy",
    "White partners the retained Fuchsia compatibility pigment; filled button components keep their own foreground paint.",
    white,
    white,
    ["action-background"],
  ),
  role(
    "actions",
    "secondary",
    "Secondary Action",
    "A quiet Rose-Lilac paper or tonal Plum control sits below the primary action.",
    APP_LIGHT_SURFACES.quiet,
    darkSurface(blend(rosePlum, roseLilac, 0.86)),
    ["secondary-foreground"],
  ),
  role(
    "actions",
    "secondary-foreground",
    "Secondary Action Copy",
    "Shared primary copy on secondary buttons and segmented controls.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["secondary"],
  ),
  role(
    "actions",
    "accent",
    "Selected Surface",
    "Rose/Lilac paper distinguishes light selections; a restrained Rose-Apricot tint marks dark selections.",
    APP_LIGHT_SURFACES.selected,
    darkSurface(blend(rosePlum, roseApricot, 0.82)),
    ["accent-foreground"],
  ),
  role(
    "actions",
    "accent-foreground",
    "Selected Copy",
    "Neutral copy remains strong inside selected items.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["accent"],
  ),
  role(
    "actions",
    "selection",
    "Text Selection",
    "A Rose/Lilac daylight wash or Rose-Apricot dark wash marks selected text.",
    alpha(blend(rose, lilac, 0.65), 0.46),
    alpha(roseApricot, 0.32),
  ),
  role(
    "edges",
    "border",
    "Divider",
    "Plum edges on light surfaces and Lilac edges on dark surfaces share the same foundation.",
    alpha(APP_LIGHT_SURFACES.ink, 0.24),
    alpha(roseLilac, 0.27),
  ),
  role(
    "edges",
    "input",
    "Input Edge",
    "Stronger Plum and Lilac boundaries distinguish editable fields.",
    alpha(APP_LIGHT_SURFACES.ink, 0.58),
    alpha(roseLilac, 0.54),
  ),
  role(
    "edges",
    "ring",
    "Keyboard Focus",
    "Solid Rose-Plum or Rose-Lilac makes keyboard focus clear against its surface.",
    APP_SECONDARY_COLOR,
    roseLilac,
  ),
  role(
    "edges",
    "ink",
    "Canonical Black",
    "The neutral darkest interface color, independent of system mode.",
    black,
    black,
  ),
  role(
    "glass",
    "glass-background",
    "Glass Wash",
    "A nearly opaque Rose/Lilac paper wash or dense Plum wash softens blurred backdrops.",
    alpha(APP_LIGHT_SURFACES.floating, 0.94),
    alpha(rosePlum, 0.82),
  ),
  role(
    "glass",
    "glass-border",
    "Glass Edge",
    "A restrained Plum or Lilac edge outlines translucent surfaces.",
    alpha(APP_LIGHT_SURFACES.ink, 0.23),
    alpha(roseLilac, 0.29),
  ),
  role(
    "glass",
    "shadow",
    "Soft Shadow",
    "Neutral Black adds depth without introducing a new hue.",
    alpha(plum, 0.16),
    alpha(black, 0.42),
  ),
  role(
    "glass",
    "glow",
    "Rose-Lilac Glow",
    "A soft Rose-Lilac halo ties highlights back to the shared Plum foundation.",
    alpha(blend(lilac, rose, 0.48), 0.2),
    alpha(blend(lilac, rose, 0.88), 0.32),
  ),
  role(
    "glass",
    "empty-intake-wash",
    "Empty Card Glass",
    "A quiet light or Plum backplate keeps empty states part of the same surface family.",
    alpha(APP_LIGHT_SURFACES.card, 0.96),
    alpha(rosePlum, 0.72),
  ),
  role(
    "glass",
    "empty-intake-hover",
    "Empty Card Hover",
    "A little more backplate opacity supports pointer hover without a new color.",
    alpha(APP_LIGHT_SURFACES.card, 1),
    alpha(rosePlum, 0.88),
  ),
  role(
    "glass",
    "empty-intake-copy",
    "Empty Card Copy",
    "Opaque secondary copy remains readable over an empty card.",
    APP_LIGHT_SURFACES.secondaryInk,
    blend(white, lilac, 0.58),
  ),
  role(
    "harmony",
    "harmony-surface",
    "Rose-Plum Feature Surface",
    "An opaque, gently Rose-inflected paper or lifted Plum backplate supports highlighted check-ins and related panels.",
    blend(APP_LIGHT_SURFACES.card, rose, 0.88),
    blend(rosePlum, lilac, 0.95),
    ["card-foreground", "muted-foreground"],
  ),
  role(
    "harmony",
    "harmony-rose-wash",
    "Rose Reflection",
    "A 10% Rose reflection in either mode adds a small warm variation behind opaque copy.",
    alpha(rose, 0.1),
    alpha(rose, 0.1),
  ),
  role(
    "harmony",
    "harmony-iris-wash",
    "Iris Reflection",
    "A 10% light-mode or 11% dark-mode Iris reflection provides a cooler counterpoint to Rose and Apricot.",
    alpha(iris, 0.1),
    alpha(iris, 0.11),
  ),
  role(
    "harmony",
    "harmony-mint-wash",
    "Mint Glint",
    "A restrained 4.5% light-mode or 6.5% dark-mode Mint glint is reserved for small highlights and completion details.",
    alpha(mint, 0.045),
    alpha(mint, 0.065),
  ),
  role(
    "harmony",
    "harmony-edge",
    "Rose-Lilac Edge Pigment",
    "A solid Rose-Plum or Rose-Lilac pigment supplies harmonious rims; each component applies its own edge opacity.",
    blend(APP_LIGHT_SURFACES.ink, rose, 0.84),
    blend(lilac, rose, 0.74),
  ),
  role(
    "harmony",
    "harmony-glow",
    "Rose-Lilac Halo",
    "An 18% light-mode or 24% dark-mode Rose-Lilac halo supplies soft depth beneath the actual surface.",
    alpha(blend(roseLilac, rose, 0.65), 0.18),
    alpha(blend(roseLilac, rose, 0.65), 0.24),
  ),
  role(
    "ambient",
    "ambient-overlay",
    "Background Veil",
    "An optional Lilac veil unifies legacy light examples; the current Iridescence field has its own exact overlays.",
    alpha(lilac, 0.08),
    alpha(plum, 0),
  ),
  role(
    "ambient",
    "ambient-center-scrim",
    "Center Anchor",
    "A restrained Plum anchor settles legacy light examples without a white center; dark mode has no center scrim.",
    alpha(plum, 0.14),
    alpha(plum, 0),
  ),
  role(
    "ambient",
    "ambient-center",
    "Background Center",
    "A Plum/Lilac center in light mode and a Plum center in dark mode.",
    blend(plum, lilac, 0.3),
    plum,
  ),
  role(
    "ambient",
    "ambient-near",
    "Inner Plum",
    "Soft Lilac surrounds the light center; deeper Plum surrounds the dark center.",
    blend(lilac, rose, 0.74),
    blend(plum, black, 0.86),
  ),
  role(
    "ambient",
    "ambient-mid",
    "Lilac Current",
    "A restrained Lilac ribbon moves through each mode\u2019s background.",
    blend(lilac, iris, 0.64),
    blend(plum, roseLilac, 0.9),
  ),
  role(
    "ambient",
    "ambient-far",
    "Apricot Trace",
    "A Rose/Lilac daylight trace or small Rose-Apricot dark trace adds restrained warmth.",
    blend(lilac, rose, 0.34),
    blend(plum, roseApricot, 0.93),
  ),
  role(
    "ambient",
    "ambient-edge",
    "Background Edge",
    "Pale Lilac at the light edge and subdued Lilac-Plum at the dark edge.",
    blend(lilac, rose, 0.68),
    blend(plum, roseLilac, 0.82),
  ),
  role(
    "feedback",
    "destructive",
    "Destructive Action",
    "A deeper Rose-Plum action or Rose-Apricot light accompanies explicit removal icons and labels.",
    "#be123c",
    roseApricot,
    ["destructive-foreground"],
  ),
  role(
    "feedback",
    "destructive-foreground",
    "Destructive Copy",
    "White or Black pairs with its destructive fill for clear, readable actions.",
    white,
    black,
    ["destructive"],
  ),
  role(
    "feedback",
    "success",
    "Success Surface",
    "A quiet Mint reflection in paper or Rose-Plum accompanies confirmation icons and wording.",
    blend(APP_LIGHT_SURFACES.card, mint, 0.78),
    darkSurface(blend(rosePlum, mint, 0.92)),
    ["success-foreground"],
  ),
  role(
    "feedback",
    "success-foreground",
    "Success Copy",
    "Neutral confirmation copy uses the same interface palette.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["success"],
  ),
  role(
    "feedback",
    "warning",
    "Attention Surface",
    "Rose-Apricot mixed into the current surface draws measured attention.",
    blend(APP_LIGHT_SURFACES.card, roseApricot, 0.7),
    darkSurface(blend(rosePlum, roseApricot, 0.84)),
    ["warning-foreground"],
  ),
  role(
    "feedback",
    "warning-foreground",
    "Attention Copy",
    "Clear neutral copy for contextual notices and warnings.",
    APP_LIGHT_SURFACES.ink,
    white,
    ["warning"],
  ),
  role(
    "feedback",
    "info",
    "Information Surface",
    "A modest Iris reflection distinguishes neutral contextual information.",
    blend(APP_LIGHT_SURFACES.card, iris, 0.73),
    darkSurface(blend(rosePlum, iris, 0.9)),
    ["info-foreground"],
  ),
  role(
    "feedback",
    "info-foreground",
    "Information Copy",
    "Shared primary text on informational panels.",
    APP_LIGHT_SURFACES.ink,
    white,
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
${APP_CANVAS_CSS}
${Object.entries(APP_FOUNDATION)
  .map(([id, color]) => `  --palette-${id}: ${color};`)
  .join("\n")}
${Object.entries(APP_HARMONY)
  .map(([id, color]) => `  --palette-${id}: ${color};`)
  .join("\n")}
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

/** Edge → center radial ramps keep canvas copy readable in each appearance. */
export const APP_BACKGROUND_COLORS_BY_MODE = Object.fromEntries(
  (["light", "dark"] as const).map((mode) => [
    mode,
    (
      [
        "ambient-edge",
        "ambient-far",
        "ambient-mid",
        "ambient-near",
        "ambient-center",
      ] as const
    ).map((id) => APP_THEME_VALUES[mode][id]),
  ]),
) as Record<AppThemeMode, AppThemeHex[]>;

/** Compatibility default for consumers that do not yet select an appearance. */
export const APP_BACKGROUND_COLORS = APP_BACKGROUND_COLORS_BY_MODE.dark;
