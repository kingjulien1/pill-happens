/** One sampled pose in the moon's seamless, browser-native ambient loop. */
export type MoonMotionFrame = Readonly<{
  offset: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  angle: number;
  velocity: number;
}>;

const TAU = Math.PI * 2;
const DURATION = 14_400;
const SEGMENTS = 240;

/**
 * A compound hanging arc, rebuilt independently from the previous pendulum.
 *
 * The primary sine supplies the broad swing. Two much quieter harmonics bend
 * the route into a soft asymmetric figure-eight, while a delayed torsion term
 * lets the crescent's face follow its travel instead of rotating in lockstep.
 * Every term is periodic, so position, pose and velocity meet without a reset.
 */
function pose(offset: number): MoonMotionFrame {
  const phase = TAU * offset;
  const horizontal =
    2.15 * Math.sin(phase) +
    0.32 * Math.sin(phase * 2) -
    0.11 * Math.sin(phase * 3);
  const vertical =
    -0.48 * (1 - Math.cos(phase * 2)) + 0.13 * Math.sin(phase) ** 3;
  const travel =
    2.15 * Math.cos(phase) +
    0.64 * Math.cos(phase * 2) -
    0.33 * Math.cos(phase * 3);
  const delayed = Math.sin(phase - 0.16 * Math.sin(phase));
  const rotation =
    7.4 * delayed + 1.25 * Math.sin(phase * 2) - 0.65 * Math.sin(phase * 3);
  const depth =
    1 + 0.014 * Math.sin(phase - Math.PI / 5) + 0.006 * Math.sin(phase * 2);

  return Object.freeze({
    offset,
    x: horizontal,
    y: vertical,
    rotation,
    scale: depth,
    angle: delayed,
    velocity: travel,
  });
}

function makeMotion() {
  const frames = Array.from({ length: SEGMENTS }, (_, index) =>
    pose(index / SEGMENTS),
  );
  frames.push(Object.freeze({ ...frames[0], offset: 1 }));
  return Object.freeze({
    duration: DURATION,
    frames: Object.freeze(frames),
  });
}

let cached: ReturnType<typeof makeMotion> | undefined;

/** Dense samples let the compositor play the nonlinear route without JS RAF. */
export function getEveningMoonMotion() {
  return (cached ??= makeMotion());
}
