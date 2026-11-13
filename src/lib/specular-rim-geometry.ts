type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Map the button outline into its padded canvas, including shared CSS scaling. */
export function mapRimToCanvas({
  button,
  canvas,
  buttonWidth,
  buttonHeight,
  bitmapWidth,
  bitmapHeight,
  radius,
}: {
  button: Bounds;
  canvas: Bounds;
  buttonWidth: number;
  buttonHeight: number;
  bitmapWidth: number;
  bitmapHeight: number;
  radius: number;
}) {
  if (
    ![
      button.width,
      button.height,
      canvas.width,
      canvas.height,
      buttonWidth,
      buttonHeight,
      bitmapWidth,
      bitmapHeight,
    ].every((value) => Number.isFinite(value) && value > 0)
  )
    return null;

  const bitmapScaleX = bitmapWidth / canvas.width;
  const bitmapScaleY = bitmapHeight / canvas.height;
  const safeRadius = Math.max(
    0,
    Math.min(
      Number.isFinite(radius) ? radius : 0,
      buttonWidth / 2,
      buttonHeight / 2,
    ),
  );
  return {
    center: [
      (button.left + button.width / 2 - canvas.left) * bitmapScaleX,
      // WebGL has its origin at the bottom left; DOM rectangles use the top left.
      (canvas.top + canvas.height - button.top - button.height / 2) *
        bitmapScaleY,
    ] as const,
    scale: [
      (button.width / buttonWidth) * bitmapScaleX,
      (button.height / buttonHeight) * bitmapScaleY,
    ] as const,
    half: [buttonWidth / 2, buttonHeight / 2] as const,
    radius: safeRadius,
    // Screen CSS coordinates keep a 3px band 3px during parent scaling too.
    pixelRatio: [bitmapScaleX, bitmapScaleY] as const,
    screenHalf: [button.width / 2, button.height / 2] as const,
    screenRadius: [
      (safeRadius * button.width) / buttonWidth,
      (safeRadius * button.height) / buttonHeight,
    ] as const,
  };
}
