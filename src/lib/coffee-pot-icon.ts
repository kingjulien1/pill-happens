import { createLucideIcon, type IconNode } from "lucide-react";

export type CoffeePotPoint = Readonly<{ x: number; y: number }>;

/** Empty carafe: the lid, glass vessel, and opposite handle share Lucide's grid. */
export const COFFEE_POT_NODES: IconNode = [
  ["path", { d: "M11 2h2", key: "lid-knob" }],
  ["path", { d: "M7 4h9M8 4v3m7-3v3M6 7h11", key: "lid" }],
  [
    "path",
    {
      d: "M7 7v2L3 8l2.2 4.6c-1.2 1.7-1.7 3.3-1.3 5.1C4.4 20.1 6.8 22 9.5 22h4c2.9 0 5.3-2 5.5-4.4.3-3.1-1.2-5.5-3-8.6V7",
      key: "vessel",
    },
  ],
  [
    "path",
    {
      d: "M16 8h3a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3",
      key: "handle",
    },
  ],
];

export const CoffeePot = createLucideIcon("coffee-pot", COFFEE_POT_NODES);

/** Local coordinates remain stable while the whole carafe rotates. */
export const COFFEE_POT_SPOUT_POINT: CoffeePotPoint = { x: 3, y: 8 };
export const COFFEE_POT_PIVOT: CoffeePotPoint = { x: 12, y: 14 };

type CavityCommand =
  | readonly ["M" | "L", number, number]
  | readonly ["C", number, number, number, number, number, number];

// Inset from the vessel's two-unit stroke. No liquid belongs to the base icon.
const cavityCommands: readonly CavityCommand[] = [
  ["M", 8, 8],
  ["L", 15, 8],
  ["L", 15, 9.3],
  ["C", 16.7, 12.4, 18.3, 14.7, 18, 17.5],
  ["C", 17.8, 19.5, 15.9, 21, 13.5, 21],
  ["L", 9.5, 21],
  ["C", 7.3, 21, 5.5, 19.4, 5.1, 17.5],
  ["C", 4.7, 15.9, 5.1, 14.5, 6.4, 12.7],
  ["L", 4.6, 9.5],
  ["L", 8, 10.3],
];

/** Exact curved clip, derived from the same commands as the volume polygon. */
export const COFFEE_POT_CAVITY_PATH = `${cavityCommands
  .map(([command, ...coordinates]) => `${command}${coordinates.join(" ")}`)
  .join(" ")}Z`;

function sampleCavity(): readonly CoffeePotPoint[] {
  const points: CoffeePotPoint[] = [];
  for (const command of cavityCommands) {
    if (command[0] !== "C") {
      points.push({ x: command[1], y: command[2] });
      continue;
    }
    const start = points[points.length - 1];
    for (let step = 1; step <= 20; step += 1) {
      const t = step / 20;
      const u = 1 - t;
      points.push({
        x:
          u ** 3 * start.x +
          3 * u ** 2 * t * command[1] +
          3 * u * t ** 2 * command[3] +
          t ** 3 * command[5],
        y:
          u ** 3 * start.y +
          3 * u ** 2 * t * command[2] +
          3 * u * t ** 2 * command[4] +
          t ** 3 * command[6],
      });
    }
  }
  return points;
}

/** Densely sampled cubic boundaries for conserving volume under rotation. */
export const COFFEE_POT_CAVITY_POINTS = sampleCavity();
export const COFFEE_POT_CAVITY_BOUNDS = {
  minX: Math.min(...COFFEE_POT_CAVITY_POINTS.map(({ x }) => x)),
  maxX: Math.max(...COFFEE_POT_CAVITY_POINTS.map(({ x }) => x)),
  minY: 8,
  maxY: 21,
} as const;
