/** Decorative quantities never replace the exact recorded amount in the card. */
export const MEDICATION_ICON_STACK = {
  size: 48,
  exposure: 0.2,
  opacityRatio: 0.83,
  sizeRatio: 0.92,
  padding: 8,
  rail: 56,
  // The 24th layer is already below 1.4% opacity. Bound costly glyph rendering
  // for large drops/pump quantities while retaining every ordinary 1–10 layer.
  maxLayers: 24,
} as const;

export type MedicationIconStackLayer = {
  index: number;
  left: number;
  top: number;
  size: number;
  scale: number;
  opacity: number;
};

/**
 * Lay out a left-front fan. Each next right edge adds one fifth of that smaller
 * frame; its vertical center stays at the front frame's center. Rail fitting
 * scales the complete fan, preserving overlap, proportions and opacity.
 */
export function getMedicationIconStack(quantity?: number) {
  const settings = MEDICATION_ICON_STACK;
  const count =
    typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
      ? Math.ceil(quantity)
      : 1;
  const layerCount = Math.min(count, settings.maxLayers);
  const layers: MedicationIconStackLayer[] = [];
  let right = 0;

  for (let index = 0; index < layerCount; index++) {
    const scale = settings.sizeRatio ** index;
    const size = settings.size * scale;
    const left = index === 0 ? 0 : right - size * (1 - settings.exposure);
    layers.push({
      index,
      left,
      top: (settings.size - size) / 2,
      size,
      scale,
      opacity: settings.opacityRatio ** index,
    });
    right = left + size;
  }

  return {
    count,
    layers,
    width: right,
    rail: {
      width: settings.rail,
      scale: Math.min(1, (settings.rail - settings.padding) / right),
    },
  };
}
