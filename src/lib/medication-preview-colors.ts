import { APP_COLORS } from "./app-theme";
import { getMedicationColor } from "./medication-appearance";
import { TAILWIND_MEDICATION_COLORS } from "./medication-palette";

type RampColor = {
  value: string;
  hex: string;
  family: string;
  shade: number;
};

export type MedicationColorScale = {
  lighter: string;
  darker: string;
  icon: string;
};

export type MedicationPreviewAccents = {
  pop: string;
  spark: string;
};

export type MedicationWaveColors = {
  above: string;
  below: string;
  aboveValue: string;
  belowValue: string;
};

const rampColors: RampColor[] = TAILWIND_MEDICATION_COLORS.flatMap((color) => {
  const match = /^tw-([a-z]+)-(\d+)$/.exec(color.value);
  return match ? [{ ...color, family: match[1], shade: Number(match[2]) }] : [];
});
const colorsByValue = new Map(rampColors.map((color) => [color.value, color]));
const families = new Map<string, RampColor[]>();
for (const color of rampColors) {
  const family = families.get(color.family) ?? [];
  family.push(color);
  families.set(color.family, family);
}
for (const colors of families.values())
  colors.sort((a, b) => a.shade - b.shade);
const familyMidpoints = rampColors.filter((color) => color.shade === 500);

function rgb(hex: string) {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
}

function nearestRampColor(hex: string) {
  // Legacy swatches keep their saved pigment; only their surrounding preview
  // takes the nearest current Tailwind ramp. Ties use stable palette order.
  const channels = rgb(hex);
  let nearest = rampColors[0];
  let minimum = Infinity;
  for (const color of rampColors) {
    const distance = rgb(color.hex).reduce(
      (sum, channel, index) => sum + (channel - channels[index]) ** 2,
      0,
    );
    if (distance < minimum) {
      nearest = color;
      minimum = distance;
    }
    if (distance === 0) break;
  }
  return nearest;
}

/** Adjacent shades for the preview wash, with a two-step deeper icon pigment. */
export function getMedicationColorScale(value?: string): MedicationColorScale {
  const selected = getMedicationColor(value);
  // Black and white sit outside Tailwind's numbered scales. Keep their end
  // pigment and use the neutral ramp rather than wrapping to another hue.
  if (selected.value === "tw-black")
    return {
      lighter: colorsByValue.get("tw-neutral-900")!.hex,
      darker: selected.hex,
      icon: selected.hex,
    };
  if (selected.value === "tw-white")
    return {
      lighter: selected.hex,
      darker: colorsByValue.get("tw-neutral-100")!.hex,
      icon: colorsByValue.get("tw-neutral-200")!.hex,
    };

  const color =
    colorsByValue.get(selected.value) ?? nearestRampColor(selected.hex);
  const family = families.get(color.family)!;
  const index = family.findIndex((item) => item.value === color.value);
  return {
    lighter: family[Math.max(0, index - 1)].hex,
    darker: family[Math.min(family.length - 1, index + 1)].hex,
    icon: family[Math.min(family.length - 1, index + 2)].hex,
  };
}

/** Neighboring palette families at shade 500; the family order wraps at its ends. */
export function getMedicationWaveColors(value?: string): MedicationWaveColors {
  const selected = getMedicationColor(value);
  const family =
    selected.value === "tw-black" || selected.value === "tw-white"
      ? "neutral"
      : (colorsByValue.get(selected.value) ?? nearestRampColor(selected.hex))
          .family;
  const index = familyMidpoints.findIndex((color) => color.family === family);
  const above =
    familyMidpoints[
      (index - 1 + familyMidpoints.length) % familyMidpoints.length
    ];
  const below = familyMidpoints[(index + 1) % familyMidpoints.length];

  return {
    above: above.hex,
    below: below.hex,
    aboveValue: above.value,
    belowValue: below.value,
  };
}

/** Two coordinated decorative hues; the selected medication pigment stays intact. */
export function getMedicationPreviewAccents(
  value?: string,
): MedicationPreviewAccents {
  const selected = getMedicationColor(value);
  const family =
    selected.value === "tw-black" || selected.value === "tw-white"
      ? "neutral"
      : (colorsByValue.get(selected.value) ?? nearestRampColor(selected.hex))
          .family;

  let pair = ["tw-orange-400", "tw-violet-400"];
  if (["red", "orange", "amber", "yellow"].includes(family))
    pair = ["tw-fuchsia-400", "tw-sky-400"];
  else if (
    ["sky", "cyan", "blue", "indigo", "violet", "purple"].includes(family)
  )
    pair = ["tw-pink-400", "tw-cyan-300"];
  else if (["lime", "olive", "green", "emerald", "teal"].includes(family))
    pair = ["tw-amber-300", "tw-blue-400"];
  else if (["fuchsia", "pink", "rose"].includes(family))
    pair = ["tw-orange-300", "tw-violet-400"];

  return {
    pop: colorsByValue.get(pair[0])!.hex,
    spark: colorsByValue.get(pair[1])!.hex,
  };
}

/** Keep extreme pigments visible without changing the icon's selected color. */
export function getMedicationPreviewSurface(hex: string): string | undefined {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const [red, green, blue] = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  // Opaque neutral backplates work in either system theme. Middle pigments
  // retain the usual popover surface rather than adding an unnecessary fill.
  if (luminance < 0.16) return APP_COLORS.peach;
  if (luminance > 0.28) return APP_COLORS.ink;
  return undefined;
}
