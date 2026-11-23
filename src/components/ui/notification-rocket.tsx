"use client";

import { useId, type CSSProperties, type SVGProps } from "react";
import { Rocket } from "lucide-react";

const engines = [
  { name: "left", x: 4, y: 12, sway: -1 },
  { name: "right", x: 12, y: 20, sway: 1 },
] as const;
const sparks = [
  { kind: "ember", x: 4, y: 12, popDelay: 0 },
  { kind: "comet", x: 12, y: 20, popDelay: 0.672 },
  { kind: "flare", x: 6, y: 18, popDelay: 1.104 },
] as const;
const jet = "M0 0C-1.4 2.3 1.6 4.2 0 6S-1.4 10.2 0 14";

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
      <g className="journal-toast-rocket-flight">
        {engines.map(({ name, x, y, sway }) => (
          <g
            key={name}
            transform={`translate(${x} ${y}) rotate(45)`}
            data-rocket-engine={name}
          >
            <g
              className="journal-toast-rocket-jet"
              style={{ "--jet-sway": sway } as CSSProperties}
            >
              <path className="journal-toast-rocket-jet-edge" d={jet} />
              <path
                className="journal-toast-rocket-jet-core"
                d={jet}
                pathLength="100"
              />
            </g>
          </g>
        ))}
        <ellipse
          className="journal-toast-rocket-heat"
          cx="4.5"
          cy="20"
          rx="7"
          ry="9"
          transform="rotate(43 4.5 20)"
          fill={`url(#${heat})`}
          stroke="none"
        />
        {sparks.map(({ kind, x, y, popDelay }) => (
          <g key={kind} transform={`translate(${x} ${y})`}>
            <g
              className="journal-toast-rocket-particle"
              data-rocket-particle={kind}
            >
              {kind === "ember" ? (
                <path d="m0-1.5 1.15 1.5L0 1.5-1.15 0Z" />
              ) : kind === "comet" ? (
                <>
                  <path
                    className="journal-toast-rocket-comet-tail"
                    d="M0-4v3"
                  />
                  <rect x="-.65" y="-1.8" width="1.3" height="3.6" rx=".65" />
                </>
              ) : (
                <circle r="1.05" />
              )}
              <g
                className="journal-toast-rocket-particle-pop"
                style={{ "--pop-delay": `${popDelay}s` } as CSSProperties}
              >
                <circle r="1.6" />
                <path d="M0-3v1 M0 2v1 M-3 0h1 M2 0h1" />
              </g>
            </g>
          </g>
        ))}
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
