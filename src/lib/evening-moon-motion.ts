/** A compositor-ready pose shared by the moon's arrival and perpetual drift. */
export type MoonMotionFrame = Readonly<{
  offset: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}>;

const TAU = Math.PI * 2;
const LOOP_DURATION = 10_800;
const ENTRY_DURATION = 2_400;

/**
 * A hanging crescent accelerates through the low point, then lingers at each
 * turning point. Small second harmonics soften its symmetry; delayed torsion
 * lets the face trail the arc. Every term is periodic, including its velocity.
 */
function drift(offset: number): MoonMotionFrame {
  const phase = TAU * offset;
  return {
    offset,
    x: 3.1 * Math.sin(phase) + 0.28 * Math.sin(phase * 2),
    y: -0.82 * (1 - Math.cos(phase * 2)) + 0.12 * Math.sin(phase),
    rotation: 10.8 * Math.sin(phase - 0.2) + 0.9 * Math.sin(phase * 2 - 0.12),
    scale: 1 + 0.012 * Math.sin(phase - 0.4),
    opacity: 1,
  };
}

/**
 * Rather than landing and restarting, arrival approaches the already-moving
 * drift. Its capture offsets have zero position, velocity and acceleration at
 * the join, so the same moon continues straight into the ambient trajectory.
 */
function arrive(offset: number): MoonMotionFrame {
  const remaining = 1 - offset;
  const pose = drift(((offset - 1) * ENTRY_DURATION) / LOOP_DURATION);
  const capture = remaining ** 3;
  const lift = Math.sin(Math.PI * offset) * remaining ** 2;

  return {
    offset,
    x: pose.x - 9 * capture + 8 * lift,
    y: pose.y + 9 * capture - 10 * lift,
    rotation:
      pose.rotation -
      152 * remaining ** 4 +
      34 * Math.sin(TAU * offset) * capture,
    scale: pose.scale - 0.78 * capture + 0.3 * lift,
    opacity: 1 - remaining ** 4,
  };
}

function sample(pose: (offset: number) => MoonMotionFrame, segments: number) {
  return Object.freeze(
    Array.from({ length: segments + 1 }, (_, index) =>
      Object.freeze(pose(index / segments)),
    ),
  );
}

function makeMotion() {
  const loopFrames = [...sample(drift, 240)];
  // Copy the exact endpoint to avoid a floating-point seam at the reset.
  loopFrames[loopFrames.length - 1] = Object.freeze({
    ...loopFrames[0],
    offset: 1,
  });
  return Object.freeze({
    entry: Object.freeze({
      duration: ENTRY_DURATION,
      frames: sample(arrive, 120),
    }),
    loop: Object.freeze({
      duration: LOOP_DURATION,
      frames: Object.freeze(loopFrames),
    }),
  });
}

let cached: ReturnType<typeof makeMotion> | undefined;

/** Sample once; native browser timelines own every rendered animation frame. */
export function getEveningMoonMotion() {
  return (cached ??= makeMotion());
}
