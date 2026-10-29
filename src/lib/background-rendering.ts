type BackgroundResolutionOptions = {
  width: number;
  height: number;
  dpr: number;
  maxDpr?: number;
  maxPixels?: number;
};

const positiveFinite = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

/** Select a backing-store density without increasing the requested/native DPR. */
export function getBackgroundResolution({
  width,
  height,
  dpr,
  maxDpr,
  maxPixels,
}: BackgroundResolutionOptions): {
  width: number;
  height: number;
  ratio: number;
} {
  const cssWidth = Math.max(1, positiveFinite(width, 1));
  const cssHeight = Math.max(1, positiveFinite(height, 1));
  let ratio = Math.min(
    positiveFinite(dpr, 1),
    positiveFinite(maxDpr, 2),
    Number.MAX_VALUE / cssWidth,
    Number.MAX_VALUE / cssHeight,
  );
  const budget =
    maxPixels !== undefined && Number.isFinite(maxPixels) && maxPixels > 0
      ? Math.max(1, Math.floor(maxPixels))
      : null;

  if (budget !== null) {
    const area = cssWidth * cssHeight;
    const budgetRatio = Number.isFinite(area)
      ? Math.sqrt(budget / area)
      : Math.sqrt(budget / cssWidth) / Math.sqrt(cssHeight);
    ratio = Math.min(
      ratio,
      budgetRatio,
      // One axis still occupies at least one pixel on very thin viewports.
      budget / cssWidth,
      budget / cssHeight,
    );
  }

  const round = budget === null ? Math.round : Math.floor;
  let pixelWidth = Math.max(1, round(cssWidth * ratio));
  let pixelHeight = Math.max(1, round(cssHeight * ratio));

  if (budget !== null) {
    // A final integer guard also covers floating-point rounding at the boundary.
    pixelHeight = Math.min(pixelHeight, budget);
    pixelWidth = Math.min(pixelWidth, Math.floor(budget / pixelHeight));
  }

  return { width: pixelWidth, height: pixelHeight, ratio };
}

/** Shader-clock seconds; a null previous timestamp starts or resumes one frame. */
export function getBackgroundFrameElapsed(
  now: number,
  previous: number | null,
): number {
  if (!Number.isFinite(now) || now < 0) return 0;
  if (previous === null) return 1 / 60;
  if (!Number.isFinite(previous) || previous < 0 || now < previous) return 0;
  return Math.min((now - previous) / 1_000, 0.25);
}
