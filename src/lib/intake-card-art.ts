export type IntakeCardArt = {
  curveA: string;
  curveB: string;
  phaseSeconds: number;
  orbitAngle: number;
  accentX: number;
  accentY: number;
};

/** Stable decoration only: the intake ID never enters SVG markup or storage. */
export function getIntakeCardArt(id: string): IntakeCardArt {
  let state = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    state = Math.imul(state ^ id.charCodeAt(index), 0x01000193);
  }
  state = state >>> 0 || 0x9e3779b9;

  const between = (minimum: number, maximum: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return minimum + ((state >>> 0) % (maximum - minimum + 1));
  };

  // Both paths curl around the medication stage at approximately (44, 44),
  // then extend beyond the right edge of a 360 × 150 viewBox for a soft crop.
  const top = between(-14, 8);
  const curveA = [
    `M -24 ${between(32, 70)}`,
    `C -4 ${top} 86 ${top} 96 ${between(36, 48)}`,
    `C 116 ${between(86, 110)} 10 ${between(102, 128)} 16 ${between(56, 78)}`,
    `C 24 ${between(-2, 22)} 182 ${between(114, 144)} 388 ${between(24, 70)}`,
  ].join(" ");
  const curveB = [
    `M -24 ${between(100, 142)}`,
    `C 4 ${between(124, 148)} 20 ${between(90, 108)} 28 ${between(64, 80)}`,
    `C 56 ${between(-10, 12)} 122 ${between(8, 28)} 110 ${between(56, 76)}`,
    `C 96 ${between(118, 140)} 254 ${between(0, 24)} 388 ${between(78, 122)}`,
  ].join(" ");

  return {
    curveA,
    curveB,
    phaseSeconds: -between(0, 240) / 10,
    orbitAngle: between(-24, 24),
    accentX: between(62, 88),
    accentY: between(22, 78),
  };
}
