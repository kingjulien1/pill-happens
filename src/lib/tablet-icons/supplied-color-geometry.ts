import type { IconNode } from "lucide-react";

/** Supplied SVG groups are flattened onto their children with identical transforms. */
export const LEVOMETHASAN_COLOR_NODES: IconNode = [
  [
    "circle",
    { cx: "12", cy: "12.3", r: "10.25", fill: "#CFC7B7", key: "tablet-depth" },
  ],
  [
    "circle",
    { cx: "12", cy: "11.65", r: "10.25", fill: "#F3EEE3", key: "tablet-face" },
  ],
  [
    "path",
    {
      fill: "#D6CCB9",
      d: "M-9.5 0-9.2-1.65H-1.65V-9.2L0-9.5V0H9.5L9.2 1.65H1.65V9.2L0 9.5V0Z",
      transform: "translate(12 11.65) rotate(36)",
      key: "score-shadow",
    },
  ],
  [
    "path",
    {
      fill: "#E8DFCF",
      d: "M-9.5 0H0V9.5L-1.65 9.2V1.65H-9.2ZM0-9.5l1.65.3v7.55H9.2L9.5 0H0Z",
      transform: "translate(12 11.65) rotate(36)",
      key: "score-face",
    },
  ],
  [
    "path",
    {
      d: "M-9.25 0h18.5M0-9.25v18.5",
      fill: "none",
      stroke: "#C5B9A3",
      strokeWidth: ".65",
      strokeLinecap: "round",
      transform: "translate(12 11.65) rotate(36)",
      key: "score-line",
    },
  ],
];

export const TESTAVAN_COLOR_NODES: IconNode = [
  [
    "path",
    {
      fill: "#F3F2EC",
      d: "M8.7 15.5h6.6v5.3c0 .66-.54 1.2-1.2 1.2H9.9c-.66 0-1.2-.54-1.2-1.2Z",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "dispenser-base",
    },
  ],
  [
    "path",
    {
      fill: "#62BE67",
      d: "M7.8 14.8h8.4v1.3a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1Z",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "base-collar",
    },
  ],
  [
    "path",
    {
      fill: "#25292C",
      d: "M7.4 3.75h9.2c0 2.1-.6 4.2-.6 6.3v5.1c0 .61-.49 1.1-1.1 1.1H9.1c-.61 0-1.1-.49-1.1-1.1v-5.1c0-2.1-.6-4.2-.6-6.3Z",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "dispenser-body",
    },
  ],
  [
    "path",
    {
      fill: "#86CF83",
      d: "M7.4 4A2 2 0 0 1 9.4 2h5.2a2 2 0 0 1 2 2v.4h-1.55l-.35.65a.8.8 0 0 1-.7.4h-4a.8.8 0 0 1-.7-.4l-.35-.65H7.4Z",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "pump-top",
    },
  ],
  [
    "path",
    {
      fill: "none",
      stroke: "#484E4E",
      strokeWidth: ".75",
      strokeLinecap: "round",
      d: "M9 11.2h6m-6 1.6h6m-6 1.6h6",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "grip-lines",
    },
  ],
  [
    "rect",
    {
      x: "9.8",
      y: "19.25",
      width: "4.4",
      height: "1",
      rx: ".5",
      fill: "#429951",
      transform: "matrix(1.38 0 0 .88 -4.56 1.44)",
      key: "base-mark",
    },
  ],
];
