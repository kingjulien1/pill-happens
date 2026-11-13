export const INTAKE_GLOW_RADIUS = 56;
export const INTAKE_GLOW_PADDING = INTAKE_GLOW_RADIUS + 8;

/** A continuous perimeter field, with zero paint before the canvas gutter. */
export function getIntakeGlowOpacity(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const remaining = Math.max(0, 1 - Math.max(0, distance) / INTAKE_GLOW_RADIUS);
  return 0.72 * remaining * remaining;
}

/** Move the broad color field gently; there are no individual traveling lights. */
export function getIntakeGlowMotion(time: number) {
  const seconds = Number.isFinite(time) ? time : 0;
  return {
    angle: (seconds / 26) * Math.PI * 2,
    opacity: 0.94 + 0.06 * Math.sin((seconds / 18) * Math.PI * 2),
  };
}

type Bounds = { left: number; top: number; width: number; height: number };

/** Only the actual viewport can crop the finite native gradients. */
export function getIntakeGlowCanvasBounds(button: Bounds, viewport: Bounds) {
  if (
    ![button.left, button.top, viewport.left, viewport.top].every(
      Number.isFinite,
    ) ||
    ![button.width, button.height, viewport.width, viewport.height].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return null;
  const right = button.left + button.width;
  const bottom = button.top + button.height;
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  if (
    right + INTAKE_GLOW_RADIUS <= viewport.left ||
    button.left - INTAKE_GLOW_RADIUS >= viewportRight ||
    bottom + INTAKE_GLOW_RADIUS <= viewport.top ||
    button.top - INTAKE_GLOW_RADIUS >= viewportBottom
  )
    return null;
  const left = Math.max(viewport.left, button.left - INTAKE_GLOW_PADDING);
  const top = Math.max(viewport.top, button.top - INTAKE_GLOW_PADDING);
  return {
    left,
    top,
    width: Math.min(viewportRight, right + INTAKE_GLOW_PADDING) - left,
    height: Math.min(viewportBottom, bottom + INTAKE_GLOW_PADDING) - top,
  };
}

/** Constant-distance travel around the real rounded outline, starting at its top. */
export function getIntakeGlowPerimeterPoint(
  width: number,
  height: number,
  radius: number,
  position: number,
): [number, number] {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const horizontal = width - r * 2;
  const vertical = height - r * 2;
  const arc = (Math.PI / 2) * r;
  const phase = Number.isFinite(position) ? ((position % 1) + 1) % 1 : 0;
  let distance = phase * (horizontal * 2 + vertical * 2 + arc * 4);
  if (distance <= horizontal) return [r + distance, 0];
  distance -= horizontal;
  if (distance < arc) {
    const angle = -Math.PI / 2 + distance / r;
    return [width - r + Math.cos(angle) * r, r + Math.sin(angle) * r];
  }
  distance -= arc;
  if (distance <= vertical) return [width, r + distance];
  distance -= vertical;
  if (distance < arc) {
    const angle = distance / r;
    return [width - r + Math.cos(angle) * r, height - r + Math.sin(angle) * r];
  }
  distance -= arc;
  if (distance <= horizontal) return [width - r - distance, height];
  distance -= horizontal;
  if (distance < arc) {
    const angle = Math.PI / 2 + distance / r;
    return [r + Math.cos(angle) * r, height - r + Math.sin(angle) * r];
  }
  distance -= arc;
  if (distance <= vertical) return [0, height - r - distance];
  distance -= vertical;
  const angle = Math.PI + distance / r;
  return [r + Math.cos(angle) * r, r + Math.sin(angle) * r];
}
