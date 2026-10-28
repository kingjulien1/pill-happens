import { LUCIDE_ICON_NAMES } from "./lucide-icon-names";
import { TAILWIND_MEDICATION_COLORS } from "./medication-palette";
import { isMedicationSvgIcon } from "./svg-icon-catalog";

/** Appearance values are persisted in medication records; keep legacy keys stable. */
export const MEDICATION_COLORS = [
  { value: "rose", label: "Ember", hex: "#f97316" },
  { value: "amber", label: "Clay", hex: "#9a3412" },
  { value: "violet", label: "Sand", hex: "#fed7aa" },
  { value: "coral", label: "Coral", hex: "#fb7185" },
  { value: "pink", label: "Pink", hex: "#ec4899" },
  { value: "raspberry", label: "Raspberry", hex: "#be185d" },
  { value: "ruby", label: "Ruby", hex: "#be123c" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
  { value: "honey", label: "Honey", hex: "#d97706" },
  { value: "lemon", label: "Lemon", hex: "#eab308" },
  { value: "lime", label: "Lime", hex: "#84cc16" },
  { value: "olive", label: "Olive", hex: "#6b7b34" },
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "mint", label: "Mint", hex: "#34d399" },
  { value: "teal", label: "Teal", hex: "#0d9488" },
  { value: "cyan", label: "Cyan", hex: "#06b6d4" },
  { value: "sky", label: "Sky", hex: "#38bdf8" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "indigo", label: "Indigo", hex: "#6366f1" },
  { value: "purple", label: "Purple", hex: "#a855f7" },
  { value: "lilac", label: "Lilac", hex: "#c4b5fd" },
  { value: "plum", label: "Plum", hex: "#86198f" },
  { value: "slate", label: "Slate", hex: "#64748b" },
  { value: "ink", label: "Ink", hex: "#334155" },
  ...TAILWIND_MEDICATION_COLORS,
] as const;

export type MedicationColor = (typeof MEDICATION_COLORS)[number]["value"];

export const MEDICATION_ICON_NAMES = [
  ...LUCIDE_ICON_NAMES,
  // Historical records use this name for the PillBottle drawing.
  "capsule",
] as const;

export type MedicationIconName = (typeof MEDICATION_ICON_NAMES)[number];

const iconNames = new Set<string>(MEDICATION_ICON_NAMES);
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });
const emojiElement = String.raw`(?:\p{Emoji_Modifier_Base}\uFE0F?\p{Emoji_Modifier}|\p{Extended_Pictographic}\uFE0F?)`;
const pictographicEmoji = new RegExp(
  `^${emojiElement}(?:\\u200D${emojiElement})*$`,
  "u",
);
const flagEmoji = /^\p{Regional_Indicator}{2}$/u;
const keycapEmoji = /^[#*0-9]\uFE0F?\u20E3$/u;
const tagFlagEmoji = /^\u{1F3F4}[\u{E0061}-\u{E007A}]{2,7}\u{E007F}$/u;

export function isMedicationLucideIcon(
  value: string,
): value is MedicationIconName {
  return iconNames.has(value);
}

/** Accept an allowlisted Lucide/local SVG name or one emoji, never markup or URLs. */
export function isMedicationIcon(value: string): boolean {
  if (!value || value.length > 64) return false;
  if (isMedicationLucideIcon(value) || isMedicationSvgIcon(value)) return true;
  if (Array.from(graphemes.segment(value)).length !== 1) return false;
  return (
    pictographicEmoji.test(value) ||
    flagEmoji.test(value) ||
    keycapEmoji.test(value) ||
    tagFlagEmoji.test(value)
  );
}

/** Unknown or missing appearance values render with the original default color. */
export function getMedicationColor(value?: string) {
  return (
    MEDICATION_COLORS.find((color) => color.value === value) ??
    MEDICATION_COLORS[0]
  );
}
