"use client";

import { useId, type CSSProperties, type SVGProps } from "react";
import { Rocket } from "lucide-react";

const dust = [
  { x: -13, y: 17, delay: -0.2, size: 0.65, duration: 2.3 },
  { x: -20, y: 16, delay: -1.05, size: 0.9, duration: 2.7 },
  { x: -16, y: 23, delay: -1.7, size: 0.6, duration: 2.5 },
  { x: -24, y: 20, delay: -0.8, size: 0.55, duration: 3.1 },
  { x: -10, y: 24, delay: -2.15, size: 1, duration: 2.9 },
  { x: -22, y: 11, delay: -2.6, size: 0.7, duration: 3.3 },
];

/** A fixed SVG flight scene: native motion, no particle timers or render loop. */
export function NotificationRocket(props: SVGProps<SVGSVGElement>) {
  const heat = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      data-update-rocket
    >
      <defs>
        <radialGradient id={heat} cx="67%" cy="32%" r="70%">
          <stop stopColor="var(--color-amber-100, #fef3c7)" stopOpacity=".85" />
          <stop
            offset=".38"
            stopColor="var(--color-amber-400, #fbbf24)"
            stopOpacity=".55"
          />
          <stop
            offset="1"
            stopColor="var(--color-amber-600, #d97706)"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>
      <g className="journal-toast-rocket-dust" stroke="none">
        {dust.map(({ x, y, delay, size, duration }, index) => (
          <circle
            key={index}
            cx="5"
            cy="19"
            r={size}
            style={
              {
                "--dust-x": `${x}px`,
                "--dust-y": `${y}px`,
                "--dust-delay": `${delay}s`,
                "--dust-duration": `${duration}s`,
              } as CSSProperties
            }
          />
        ))}
      </g>
      <g className="journal-toast-rocket-flight">
        <g className="journal-toast-rocket-trails" strokeWidth="1.15">
          <path d="m6 18-4 4" />
          <path d="m4.5 15.5-3 3" />
          <path d="m8.5 20-3 3" />
        </g>
        <ellipse
          className="journal-toast-rocket-heat"
          cx="4.5"
          cy="20"
          rx="5.5"
          ry="7"
          transform="rotate(43 4.5 20)"
          fill={`url(#${heat})`}
          stroke="none"
        />
        <path
          className="journal-toast-rocket-flame"
          d="M7 16c-3 .5-5 3-5.5 6.5C5 22 7.5 20 8 17Z"
          stroke="none"
        />
        <Rocket
          className="journal-toast-rocket-body"
          width="24"
          height="24"
          strokeWidth={props.strokeWidth ?? 2.8}
        />
      </g>
    </svg>
  );
}
