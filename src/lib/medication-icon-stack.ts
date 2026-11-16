/** Decorative quantities never replace the exact recorded amount in the card. */
export const MEDICATION_ICON_STACK = {
  size: 48,
  exposure: 0.2,
  opacityRatio: 0.83,
  sizeRatio: 0.92,
  padding: 8,
  rail: 56,
  // Keep the front frame and at most two decorative copies. The quantity badge
  // and dose retain the real amount independently of this visual limit.
  maxLayers: 3,
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
 * Start with a left-front fan exposing one fifth of each smaller rear frame.
 * Keep their shared vertical center, then compress only the exposed rear edges
 * into the rail so the front frame never shrinks.
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

  const frontLeft = settings.padding / 2;
  const maxWidth = settings.rail - frontLeft;
  const exposure = right - settings.size;
  const exposureRatio =
    exposure > 0 ? Math.min(1, (maxWidth - settings.size) / exposure) : 1;
  if (exposureRatio < 1) {
    for (const layer of layers) {
      const edge = layer.left + layer.size;
      layer.left =
        settings.size + (edge - settings.size) * exposureRatio - layer.size;
    }
  }

  return {
    count,
    layers,
    width: Math.min(right, maxWidth),
    rail: {
      width: settings.rail,
      frontLeft,
    },
  };
}
