import { EMOJI_CATALOG, searchEmoji } from "./emoji-catalog";
import { LUCIDE_ICON_CATALOG, searchLucideIcons } from "./lucide-catalog";
import {
  isMedicationIcon,
  isMedicationLucideIcon,
} from "./medication-appearance";
import {
  isMedicationSvgIcon,
  searchSvgIcons,
  SVG_ICON_CATALOG,
} from "./svg-icon-catalog";

export type SymbolSourceFilter = "all" | "icons" | "emojis" | "customs";

export type SymbolOption = {
  value: string;
  label: string;
  source: "Icon" | "SVG" | "Color" | "Emoji";
};

export const SYMBOL_PAGE_SIZE = 100;

export const SYMBOL_SOURCE_COUNTS = {
  icons: LUCIDE_ICON_CATALOG.length + SVG_ICON_CATALOG.length,
  emojis: EMOJI_CATALOG.length,
  customs: SVG_ICON_CATALOG.length,
};

/** Return the complete local result set; callers page it without losing matches. */
export function searchMedicationSymbols(
  query: string,
  source: SymbolSourceFilter,
): SymbolOption[] {
  const trimmed = query.trim();
  if (!trimmed && source === "all") return [];

  const includeIcons = source === "all" || source === "icons";
  const includeSvgs = includeIcons || source === "customs";
  const includeEmoji = source === "all" || source === "emojis";
  const icons = includeIcons
    ? trimmed
      ? searchLucideIcons(trimmed, Infinity)
      : LUCIDE_ICON_CATALOG
    : [];
  const svgs = includeSvgs
    ? trimmed
      ? searchSvgIcons(trimmed, Infinity)
      : SVG_ICON_CATALOG
    : [];
  const emoji = includeEmoji
    ? trimmed
      ? searchEmoji(trimmed, Infinity)
      : EMOJI_CATALOG
    : [];
  const results: SymbolOption[] = [];
  const values = new Set<string>();
  const append = (option: SymbolOption) => {
    const identity = option.value.replaceAll("\uFE0F", "");
    if (values.has(identity)) return;
    values.add(identity);
    results.push(option);
  };

  for (
    let index = 0;
    index < Math.max(icons.length, svgs.length, emoji.length);
    index++
  ) {
    const icon = icons[index];
    const svg = svgs[index];
    const glyph = emoji[index];
    if (icon) append({ value: icon.value, label: icon.label, source: "Icon" });
    if (svg)
      append({
        value: svg.value,
        label: svg.label,
        source: svg.variant === "color" ? "Color" : "SVG",
      });
    if (glyph)
      append({ value: glyph.value, label: glyph.label, source: "Emoji" });
  }

  if (
    includeEmoji &&
    !isMedicationLucideIcon(trimmed) &&
    !isMedicationSvgIcon(trimmed) &&
    isMedicationIcon(trimmed) &&
    !values.has(trimmed.replaceAll("\uFE0F", ""))
  ) {
    results.unshift({ value: trimmed, label: "Your emoji", source: "Emoji" });
  }
  return results;
}
