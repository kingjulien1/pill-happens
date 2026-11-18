import type { IconNode } from "lucide-react";

/**
 * Lucide-compatible open mouth distilled from the supplied illustrated mark.
 * Separate lip, teeth and tongue contours keep the reference readable without
 * fills, gradients, highlights or any raster-only detail.
 */
export const MOUTH_OPEN_NODES: IconNode = [
  [
    "path",
    {
      d: "M3.5 12.75c2.3-4.15 5.55-7.25 9.15-8.25 1.55-.45 2.45.35 3.55-.25 1.2-.65 2.6-.2 3.45 1.05 1.5 2.2 1.55 6.25.25 9.7-1.15 3.1-3.5 4.75-6.55 4.5-3.7-.3-7.35-2.4-9.4-4.45-1.05-1.05-1.15-2.05-.25-3.55Z",
      key: "outer-mouth",
    },
  ],
  [
    "path",
    {
      d: "M4.15 12.85c3.4-1.35 6.15-4.5 9.95-4.75 2.2-.15 3.75-1.15 4.9-.35.75.5 1 1.65.9 2.8-.25 2.95-1.45 5.6-3.5 6.65-2.65 1.35-6.2.1-8.75-1.25-1.55-.85-2.85-1.85-3.5-3.1Z",
      key: "mouth-opening",
    },
  ],
  [
    "path",
    {
      d: "M5.45 12.2c3.1-1.45 5.6-3.85 8.85-4.1 1.85-.15 3.35-.85 4.5-.55",
      key: "teeth-edge",
    },
  ],
  ["path", { d: "m9.35 10.55.25 2.1", key: "left-tooth" }],
  ["path", { d: "m13.2 8.45.25 3.05", key: "middle-tooth" }],
  ["path", { d: "m17.15 7.8.15 2.7", key: "right-tooth" }],
  [
    "path",
    {
      d: "M5.4 14.15c2.05-1.35 4.55-1.15 6.3.2 1.15.9 1.95 2 2.6 3.15",
      key: "tongue",
    },
  ],
];
