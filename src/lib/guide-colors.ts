import { MEDICATION_COLORS } from "@/lib/medication-appearance";
import {
  APP_PALETTE,
  APP_THEME_GROUPS,
  APP_THEME_TOKENS,
  APP_THEME_VALUES,
  renderAppThemeCss,
} from "@/lib/app-theme";

export type GuideThemeMode = "light" | "dark";
export type GuideThemeRole = (typeof APP_THEME_TOKENS)[number];

/** The live application tokens, not a second hand-maintained palette. */
export const GUIDE_BRAND_COLORS = APP_PALETTE;
export const GUIDE_THEME_ROLES = APP_THEME_TOKENS;
export const GUIDE_THEME_GROUPS = APP_THEME_GROUPS.map((group) => ({
  ...group,
  roles: APP_THEME_TOKENS.filter((role) => role.group === group.id),
}));

export const GUIDE_FEATURED_ROLES = [
  "--action-background",
  "--secondary",
  "--accent",
  "--background",
  "--card",
  "--foreground",
].flatMap((token) => {
  const role = APP_THEME_TOKENS.find((item) => item.token === token);
  return role ? [role] : [];
});

export const GUIDE_THEME_CSS = renderAppThemeCss();
export const GUIDE_THEME_JSON = JSON.stringify(
  { palette: APP_PALETTE, tokens: APP_THEME_TOKENS, modes: APP_THEME_VALUES },
  null,
  2,
);

export function guideRole(id: string) {
  return APP_THEME_TOKENS.find((role) => role.id === id);
}

/** HEX stays exact; alpha is documented rather than silently discarded. */
export function guideColorDetails(hex: string) {
  const value = hex.replace(/^#/, "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const alpha =
    value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1;
  const percent = Math.round(alpha * 1000) / 10;
  return {
    red,
    green,
    blue,
    alpha,
    opacity: `${percent}%`,
    rgb:
      alpha === 1
        ? `rgb(${red} ${green} ${blue})`
        : `rgb(${red} ${green} ${blue} / ${percent}%)`,
  };
}

function luminance(channels: number[]) {
  return channels
    .map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    })
    .reduce(
      (total, channel, index) =>
        total + channel * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}

/** Preview labels use the more readable of the actual Peach and Ink pigments. */
export function guidePreviewInk(hex: string, mode: GuideThemeMode) {
  const color = guideColorDetails(hex);
  const canvas = APP_THEME_TOKENS.find((role) => role.token === "--background");
  const base = guideColorDetails(canvas?.[mode] ?? APP_PALETTE[0].hex);
  const background = [color.red, color.green, color.blue].map(
    (channel, index) =>
      channel * color.alpha +
      [base.red, base.green, base.blue][index] * (1 - color.alpha),
  );
  const candidates = ["ink", "peach"].flatMap((id) => {
    const item = APP_PALETTE.find((color) => color.id === id);
    return item ? [item.hex] : [];
  });
  return candidates.reduce((best, candidate) => {
    const ratio = (value: string) => {
      const rgb = guideColorDetails(value);
      const a = luminance([rgb.red, rgb.green, rgb.blue]);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    return ratio(candidate) > ratio(best) ? candidate : best;
  }, candidates[0]);
}

/** Saved medication pigments remain a separate, literal catalog. */
export const GUIDE_MEDICATION_COLORS = MEDICATION_COLORS.map((color) => ({
  ...color,
  family: !color.value.startsWith("tw-")
    ? "Original"
    : color.value === "tw-black" || color.value === "tw-white"
      ? "Black & White"
      : color.label.replace(/ \d+$/, ""),
}));
export const GUIDE_COLOR_FAMILIES = [
  ...new Set(GUIDE_MEDICATION_COLORS.map((color) => color.family)),
];
