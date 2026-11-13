const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

/** Read a CSS rim stop without dropping the opacity in eight-digit hex colors. */
export function readRimColor(value: string, fallback: string): Float32Array {
  const candidate = value.trim();
  const selected = HEX_COLOR.test(candidate) ? candidate : fallback.trim();
  // Minified CSS can use #RGB or #RGBA. Expand those valid forms before
  // uploading the same pigment and opacity to the animated WebGL border.
  const hex =
    selected.length === 4 || selected.length === 5
      ? `#${[...selected.slice(1)].map((digit) => digit + digit).join("")}`
      : selected;
  return new Float32Array([
    ...[1, 3, 5].map(
      (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
    ),
    hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1,
  ]);
}
