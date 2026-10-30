export type IntakeCardWaves = {
  curveA: string;
  curveB: string;
  phaseSeconds: number;
};

/** Stable, gently spaced wave geometry in a 360 × 150 viewBox. */
export function getIntakeCardWaves(id: string): IntakeCardWaves {
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

  const x = [-24, between(70, 108), between(230, 270), 388];
  const upper = [
    between(50, 62),
    between(14, 26),
    between(80, 92),
    between(44, 56),
  ];
  const lower = upper.map((height) => height + between(28, 40));
  const handle = between(28, 34);

  function wave(heights: readonly number[]): string {
    const commands = [`M ${x[0]} ${heights[0]}`];
    for (let index = 1; index < x.length; index += 1) {
      // Shared handle lengths give both sides of each crest/trough the same
      // horizontal tangent. All control points advance, so curves never curl.
      commands.push(
        `C ${x[index - 1] + handle} ${heights[index - 1]} ${x[index] - handle} ${heights[index]} ${x[index]} ${heights[index]}`,
      );
    }
    return commands.join(" ");
  }

  return {
    curveA: wave(upper),
    curveB: wave(lower),
    phaseSeconds: -between(0, 200) / 10,
  };
}
