import {
  COFFEE_POT_CAVITY_POINTS,
  COFFEE_POT_PIVOT,
  COFFEE_POT_SPOUT_POINT,
  type CoffeePotPoint,
} from "./coffee-pot-icon";

export const COFFEE_TIMING = {
  steamFadeMs: 3_000,
  gapMs: 200,
  entryMs: 1_100,
  pourMs: 2_000,
  exitMs: 1_050,
  minDwellMs: 6_000,
  maxDwellMs: 12_000,
} as const;

export const COFFEE_POUR_ROTATION = -65;
export const COFFEE_INITIAL_FILL = 0.74;
export const COFFEE_STEAM_OPACITY = 0.75;

export type CoffeeScenePhase =
  "steam-fade" | "gap" | "entry" | "pour" | "exit" | "dwell";

export type CoffeePotPose = {
  /** The world position of the pot's local pivot. */
  x: number;
  y: number;
  rotation: number;
  /** Relative size; the exit ends at exactly one fifth of the resting size. */
  scale: number;
  opacity: number;
  visible: boolean;
  matrix: readonly [number, number, number, number, number, number];
  transform: string;
};

export type CoffeeSceneOptions = {
  /** Actual top center of the mug, in the scene's SVG coordinate system. */
  mugTarget?: CoffeePotPoint;
  /** Final spout position. Omit to place the spout exactly at mugTarget. */
  pourTarget?: CoffeePotPoint;
  /** A point just inside the cup can keep the short stream visible. */
  streamTarget?: CoffeePotPoint;
  entryStart?: CoffeePotPoint;
  entryControl?: CoffeePotPoint;
  /** May extend beyond the scene's viewBox for the pot's departure. */
  exitTarget?: CoffeePotPoint;
  /** Scene units per one unit of the pot's 24 × 24 icon grid. */
  potScale?: number;
  dwellMs?: number;
};

export type CoffeeLiquid = {
  path: string;
  points: readonly CoffeePotPoint[];
  area: number;
  fillFraction: number;
  freeSurface: {
    /** World angle, independent of the pot's rotation. Zero is horizontal. */
    worldAngle: number;
    /** Local half-plane: normal.x*x + normal.y*y >= level is submerged. */
    normal: CoffeePotPoint;
    level: number;
  };
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;
const smoothstep = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const smootherstep = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (from: number, to: number, progress: number) =>
  from * (1 - progress) + to * progress;
const dot = (point: CoffeePotPoint, normal: CoffeePotPoint) =>
  point.x * normal.x + point.y * normal.y;
const format = (value: number) => Number(value.toFixed(6));

export function coffeePolygonArea(points: readonly CoffeePotPoint[]) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    twiceArea += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(twiceArea) / 2;
}

/** Clip the cavity against gravity's half-plane, including its curved samples. */
function submergedPolygon(
  cavity: readonly CoffeePotPoint[],
  normal: CoffeePotPoint,
  level: number,
) {
  const result: CoffeePotPoint[] = [];
  if (cavity.length === 0) return result;
  let previous = cavity[cavity.length - 1];
  let previousDepth = dot(previous, normal) - level;

  for (const current of cavity) {
    const currentDepth = dot(current, normal) - level;
    if (currentDepth >= 0 !== previousDepth >= 0) {
      const amount = previousDepth / (previousDepth - currentDepth);
      result.push({
        x: lerp(previous.x, current.x, amount),
        y: lerp(previous.y, current.y, amount),
      });
    }
    if (currentDepth >= 0) result.push(current);
    previous = current;
    previousDepth = currentDepth;
  }
  return result;
}

function polygonPath(points: readonly CoffeePotPoint[]) {
  if (points.length < 3) return "";
  return `${points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${format(point.x)} ${format(point.y)}`,
    )
    .join(" ")}Z`;
}

/**
 * Solve the local liquid shape from volume and world gravity. The free surface
 * is inverse-rotated into pot coordinates; its height is then found by area,
 * rather than interpolating a local y coordinate as the pot tips.
 */
export function solveCoffeeLiquid(
  fillFraction: number,
  potRotation: number,
  options: {
    sloshAngle?: number;
    cavity?: readonly CoffeePotPoint[];
  } = {},
): CoffeeLiquid {
  const fraction = clamp(finite(fillFraction, 0));
  const cavity = options.cavity ?? COFFEE_POT_CAVITY_POINTS;
  const worldAngle = finite(options.sloshAngle ?? 0, 0);
  const relativeRotation = radians(finite(potRotation, 0) - worldAngle);
  const normal = {
    x: Math.sin(relativeRotation),
    y: Math.cos(relativeRotation),
  };
  const heights = cavity.map((point) => dot(point, normal));
  const minimumHeight = heights.length ? Math.min(...heights) : 0;
  const maximumHeight = heights.length ? Math.max(...heights) : 0;
  let low = minimumHeight;
  let high = maximumHeight;
  const targetArea = coffeePolygonArea(cavity) * fraction;

  // 40 iterations put numerical volume error far below a displayed subpixel.
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    if (
      coffeePolygonArea(submergedPolygon(cavity, normal, middle)) > targetArea
    )
      low = middle;
    else high = middle;
  }
  const level =
    fraction === 1
      ? minimumHeight
      : fraction === 0
        ? maximumHeight
        : (low + high) / 2;
  const points =
    fraction === 0
      ? []
      : fraction === 1
        ? [...cavity]
        : submergedPolygon(cavity, normal, level);
  return {
    path: polygonPath(points),
    points,
    area: coffeePolygonArea(points),
    fillFraction: fraction,
    freeSurface: { worldAngle, normal, level },
  };
}

function dwellDuration(dwellMs = 8_000) {
  return clamp(
    finite(dwellMs, 8_000),
    COFFEE_TIMING.minDwellMs,
    COFFEE_TIMING.maxDwellMs,
  );
}

export function getCoffeeSceneActiveDuration() {
  return (
    COFFEE_TIMING.steamFadeMs +
    COFFEE_TIMING.gapMs +
    COFFEE_TIMING.entryMs +
    COFFEE_TIMING.pourMs +
    COFFEE_TIMING.exitMs
  );
}

export function getCoffeeSceneDuration(dwellMs?: number) {
  return getCoffeeSceneActiveDuration() + dwellDuration(dwellMs);
}

function makePose(
  x: number,
  y: number,
  rotation: number,
  scale: number,
  opacity: number,
  visible: boolean,
  potScale: number,
): CoffeePotPose {
  const angle = radians(rotation);
  const cosine = Math.cos(angle) * scale * potScale;
  const sine = Math.sin(angle) * scale * potScale;
  const matrix = [
    cosine,
    sine,
    -sine,
    cosine,
    x - cosine * COFFEE_POT_PIVOT.x + sine * COFFEE_POT_PIVOT.y,
    y - sine * COFFEE_POT_PIVOT.x - cosine * COFFEE_POT_PIVOT.y,
  ] as const;
  return {
    x,
    y,
    rotation,
    scale,
    opacity,
    visible,
    matrix,
    transform: `matrix(${matrix.map(format).join(" ")})`,
  };
}

export function transformCoffeePotPoint(
  point: CoffeePotPoint,
  pose: CoffeePotPose,
): CoffeePotPoint {
  const [a, b, c, d, e, f] = pose.matrix;
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}

function bezier(
  from: number,
  first: number,
  second: number,
  to: number,
  progress: number,
) {
  const inverse = 1 - progress;
  return (
    inverse ** 3 * from +
    3 * inverse ** 2 * progress * first +
    3 * inverse * progress ** 2 * second +
    progress ** 3 * to
  );
}

/** One finite cycle; the caller chooses a fresh 6–12s dwell before repeating. */
export function getCoffeeSceneFrame(
  elapsedMs: number,
  options: CoffeeSceneOptions = {},
) {
  const mugTarget = options.mugTarget ?? { x: 64, y: 56 };
  const pourTarget = options.pourTarget ?? mugTarget;
  const streamTarget = options.streamTarget ?? mugTarget;
  const potScale = Math.max(0.01, finite(options.potScale ?? 1.2, 1.2));
  const durations = [
    ["steam-fade", COFFEE_TIMING.steamFadeMs],
    ["gap", COFFEE_TIMING.gapMs],
    ["entry", COFFEE_TIMING.entryMs],
    ["pour", COFFEE_TIMING.pourMs],
    ["exit", COFFEE_TIMING.exitMs],
    ["dwell", dwellDuration(options.dwellMs)],
  ] as const;
  let time = Math.max(0, finite(elapsedMs, 0));
  let phase: CoffeeScenePhase = "dwell";
  let progress = 1;
  for (const [candidate, duration] of durations) {
    if (time < duration || candidate === "dwell") {
      phase = candidate;
      progress = clamp(time / duration);
      break;
    }
    time -= duration;
  }

  const finalAngle = radians(COFFEE_POUR_ROTATION);
  const spoutX = COFFEE_POT_SPOUT_POINT.x - COFFEE_POT_PIVOT.x;
  const spoutY = COFFEE_POT_SPOUT_POINT.y - COFFEE_POT_PIVOT.y;
  const finalX =
    pourTarget.x -
    potScale * (spoutX * Math.cos(finalAngle) - spoutY * Math.sin(finalAngle));
  const finalY =
    pourTarget.y -
    potScale * (spoutX * Math.sin(finalAngle) + spoutY * Math.cos(finalAngle));
  const entryOrigin = options.entryStart ?? { x: finalX + 35, y: finalY - 14 };
  const entryControl = options.entryControl ?? {
    x: finalX + 18,
    y: finalY - 30,
  };
  const exitTarget = options.exitTarget ?? { x: finalX - 100, y: finalY - 44 };
  let pot = makePose(entryOrigin.x, entryOrigin.y, 0, 0.2, 0, false, potScale);
  let fillFraction = COFFEE_INITIAL_FILL;
  let sloshAngle = 0;
  let mugFill = 0;
  let steamOpacity = 0;
  let streamProgress = 0;
  let streamOpacity = 0;

  if (phase === "steam-fade") {
    steamOpacity = COFFEE_STEAM_OPACITY * (1 - smoothstep(progress));
    mugFill = 1 - smoothstep(progress);
  } else if (phase === "entry") {
    const travel = smootherstep(progress);
    pot = makePose(
      bezier(entryOrigin.x, entryControl.x, finalX + 6, finalX, travel),
      bezier(entryOrigin.y, entryControl.y, finalY - 24, finalY, travel),
      COFFEE_POUR_ROTATION * smoothstep(progress),
      lerp(0.2, 1, smoothstep(progress)),
      smoothstep(progress / 0.55),
      true,
      potScale,
    );
    sloshAngle =
      5 *
      Math.sin(progress * Math.PI * 3) *
      Math.sin(progress * Math.PI) ** 2 *
      Math.exp(-progress);
  } else if (phase === "pour") {
    pot = makePose(finalX, finalY, COFFEE_POUR_ROTATION, 1, 1, true, potScale);
    const firstHalf = clamp(progress * 2);
    const unsettled =
      progress < 0.5
        ? 0.018 *
          Math.sin(progress * Math.PI * 6) *
          Math.sin(progress * Math.PI * 2) ** 2
        : 0;
    fillFraction = COFFEE_INITIAL_FILL * (1 - progress + unsettled);
    sloshAngle =
      3 *
      Math.sin(firstHalf * Math.PI * 3) *
      Math.sin(firstHalf * Math.PI) ** 2 *
      (1 - firstHalf);
    mugFill = 1 - fillFraction / COFFEE_INITIAL_FILL;
    steamOpacity = COFFEE_STEAM_OPACITY * smoothstep(progress);
    streamProgress = smoothstep(progress / 0.07);
    streamOpacity =
      smoothstep(progress / 0.07) * smoothstep((1 - progress) / 0.08);
  } else if (phase === "exit" || phase === "dwell") {
    const exitProgress = phase === "dwell" ? 1 : progress;
    // The cubic term gives the final third its quick, slightly silly departure.
    const travel = 0.35 * exitProgress + 0.65 * exitProgress ** 3;
    pot = makePose(
      lerp(finalX, exitTarget.x, travel),
      lerp(finalY, exitTarget.y, travel) - 7 * Math.sin(exitProgress * Math.PI),
      COFFEE_POUR_ROTATION -
        145 * travel +
        10 *
          Math.sin(exitProgress * Math.PI * 2) *
          Math.sin(exitProgress * Math.PI),
      lerp(1, 0.2, travel),
      lerp(1, 0.38, travel),
      phase === "exit",
      potScale,
    );
    fillFraction = 0;
    mugFill = 1;
    steamOpacity = COFFEE_STEAM_OPACITY;
  }

  const liquid = solveCoffeeLiquid(fillFraction, pot.rotation, { sloshAngle });
  return {
    phase,
    progress,
    pot,
    fillFraction,
    fluidPath: liquid.path,
    fluidSurface: liquid.freeSurface,
    liquid,
    stream: {
      progress: streamProgress,
      opacity: streamOpacity,
      start: transformCoffeePotPoint(COFFEE_POT_SPOUT_POINT, pot),
      end: streamTarget,
    },
    mugFill,
    steamOpacity,
  };
}
