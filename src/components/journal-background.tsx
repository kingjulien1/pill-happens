"use client";

import { useSyncExternalStore } from "react";
import Grainient from "@/components/grainient";

const colorQuery = "(prefers-color-scheme: dark)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(colorQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(colorQuery).matches;
const getServerSnapshot = () => null;
const colors = ["#120f17", "#2a0f0a", "#9a3412", "#f97316", "#fed7aa"];

export function JournalBackground() {
  const dark = useSyncExternalStore<boolean | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <div className="ambient" data-background="grainient" aria-hidden="true">
      {dark !== null && (
        <Grainient
          colors={colors}
          type="radial"
          flow={0.85}
          variation={16}
          speed={2.8}
          interactive={false}
          saturation={1.01}
          scale={0.3}
          contrast={0.84}
          silk={0.58}
          softness={0.96}
          grainAmount={0.07}
          grainSize={1.2}
          grainAnimated
          clickSwirl={false}
          intro
          lightMode={!dark}
        />
      )}
    </div>
  );
}
