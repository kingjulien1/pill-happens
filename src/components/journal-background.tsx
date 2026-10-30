"use client";

import { useSyncExternalStore } from "react";
import Grainient from "@/components/grainient";
import { APP_BACKGROUND_COLORS } from "@/lib/app-theme";

const colorQuery = "(prefers-color-scheme: dark)";
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(colorQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(colorQuery).matches;
const getServerSnapshot = () => null;
const mobileQuery = "(max-width: 767px), (pointer: coarse)";
const subscribeMobile = (onChange: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerMobileSnapshot = () => false;

export function JournalBackground() {
  const dark = useSyncExternalStore<boolean | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );

  return (
    <div
      className="ambient"
      data-background="grainient"
      data-motion-profile={mobile ? "mobile" : "desktop"}
      aria-hidden="true"
    >
      {dark !== null && (
        <Grainient
          colors={APP_BACKGROUND_COLORS}
          type="radial"
          flow={mobile ? 1.3 : 0.85}
          variation={16}
          speed={mobile ? 5.6 : 2.8}
          interactive={false}
          saturation={1.01}
          scale={mobile ? 0.42 : 0.3}
          contrast={dark ? 0.92 : 1}
          silk={0.58}
          softness={0.96}
          grainAmount={dark ? 0.07 : 0.055}
          grainSize={1.2}
          grainAnimated
          clickSwirl={false}
          intro
          lightMode={!dark}
          maxDpr={mobile ? 1.25 : undefined}
          maxPixels={mobile ? 750_000 : undefined}
          className={mobile ? "grainient-mobile-motion" : undefined}
        />
      )}
    </div>
  );
}
