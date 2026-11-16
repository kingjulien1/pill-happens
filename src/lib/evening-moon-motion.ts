/** A native-animation pose sampled from a pendulum and a following torsion spring. */
export type MoonMotionFrame = Readonly<{
  offset: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  angle: number;
  velocity: number;
}>;

type Pair = readonly [number, number];
const TAU = Math.PI * 2;
const AMPLITUDE = (21 * Math.PI) / 180;
const SWING_SECONDS = 8.4;
const SEGMENTS = 224;
const PRIMARY_STEP = 1 / 240;
const SPRING_STEPS = 1024;

function rk4(
  [position, velocity]: Pair,
  time: number,
  step: number,
  acceleration: (position: number, velocity: number, time: number) => number,
): Pair {
  const a = acceleration(position, velocity, time);
  const bVelocity = velocity + (a * step) / 2;
  const b = acceleration(
    position + (velocity * step) / 2,
    bVelocity,
    time + step / 2,
  );
  const cVelocity = velocity + (b * step) / 2;
  const c = acceleration(
    position + (bVelocity * step) / 2,
    cVelocity,
    time + step / 2,
  );
  const dVelocity = velocity + c * step;
  const d = acceleration(position + cVelocity * step, dVelocity, time + step);
  return [
    position +
      (step * (velocity + 2 * bVelocity + 2 * cVelocity + dVelocity)) / 6,
    velocity + (step * (a + 2 * b + 2 * c + d)) / 6,
  ];
}

function makeMotion() {
  // Unit gravity/length: angular acceleration is -sin(angle), not a tween.
  const speed = Math.sqrt(2 * (1 - Math.cos(AMPLITUDE)));
  const path: { time: number; state: Pair }[] = [
    { time: 0, state: [0, speed] },
  ];
  let state: Pair = [0, speed];
  let time = 0;
  for (let index = 0; index < 2400; index++) {
    const next = rk4(state, time, PRIMARY_STEP, (angle) => -Math.sin(angle));
    if (time > 3 && state[0] < 0 && next[0] >= 0 && next[1] > 0) {
      time += PRIMARY_STEP * (-state[0] / (next[0] - state[0]));
      path.push({ time, state: [0, speed] });
      break;
    }
    time += PRIMARY_STEP;
    path.push({ time, state: next });
    state = next;
  }
  const period = time;
  const primary = (phase: number): Pair => {
    const fraction = ((phase % 1) + 1) % 1;
    const at = fraction * period;
    const index = Math.min(Math.floor(at / PRIMARY_STEP), path.length - 2);
    const a = path[index];
    const b = path[index + 1];
    const mix = (at - a.time) / (b.time - a.time);
    return [
      a.state[0] + (b.state[0] - a.state[0]) * mix,
      a.state[1] + (b.state[1] - a.state[1]) * mix,
    ];
  };

  // A damped torsion spring follows the same angle, preserving a small inertial
  // lag. Warm-up reaches its periodic response before any visible frame exists.
  const springFrequency = TAU / 3.2;
  const damping = 0.72;
  const step = SWING_SECONDS / SPRING_STEPS;
  const acceleration = (position: number, velocity: number, seconds: number) =>
    springFrequency ** 2 * (primary(seconds / SWING_SECONDS)[0] - position) -
    2 * damping * springFrequency * velocity;
  let spring: Pair = [0, 0];
  for (let cycle = 0; cycle < 6; cycle++)
    for (let index = 0; index < SPRING_STEPS; index++)
      spring = rk4(spring, index * step, step, acceleration);
  const springPath: number[] = [spring[0]];
  for (let index = 0; index < SPRING_STEPS; index++) {
    spring = rk4(spring, index * step, step, acceleration);
    springPath.push(spring[0]);
  }
  const springSeamError = Math.abs(springPath[0] - springPath[SPRING_STEPS]);
  const follow = (phase: number) => {
    const at = (((phase % 1) + 1) % 1) * SPRING_STEPS;
    const index = Math.min(Math.floor(at), SPRING_STEPS - 1);
    return (
      springPath[index] +
      (springPath[index + 1] - springPath[index]) * (at - index)
    );
  };

  const frames: MoonMotionFrame[] = [];
  for (let index = 0; index < SEGMENTS; index++) {
    const offset = index / SEGMENTS;
    const [angle, velocity] = primary(offset * 2);
    const slow = Math.sin(TAU * offset);
    frames.push(
      Object.freeze({
        offset,
        x: 11 * Math.sin(angle) + 0.25 * slow,
        y: 11 * (Math.cos(angle) - 1) + 0.32 * slow,
        rotation:
          ((0.55 * angle + 0.4 * (follow(offset * 2) - springPath[0])) * 180) /
            Math.PI +
          1.8 * slow,
        scale: 1 + 0.022 * slow,
        angle,
        velocity,
      }),
    );
  }
  // Identical endpoints, with the steady spring response preserving momentum.
  frames.push(Object.freeze({ ...frames[0], offset: 1 }));
  return Object.freeze({
    duration: SWING_SECONDS * 2 * 1000,
    amplitude: AMPLITUDE,
    energy: 1 - Math.cos(AMPLITUDE),
    naturalPeriod: period,
    springSeamError,
    frames: Object.freeze(frames),
  });
}

let cached: ReturnType<typeof makeMotion> | undefined;

/** Computed once; the browser plays the sampled motion without a JS frame loop. */
export function getEveningMoonMotion() {
  return (cached ??= makeMotion());
}
