export const BRAND_HOVER_PLAYBACK_RATE = 19 / 18;

const tabletLoops = new Set([
  "tablet-orbit",
  "tablet-approach-first",
  "tablet-approach-second",
  "tablet-spin-first",
  "tablet-spin-second",
]);

type BrandAnimation = {
  animationName?: unknown;
  updatePlaybackRate?: (rate: number) => void;
};
type BrandAnimationSource = {
  getAnimations?: (options: { subtree: true }) => readonly BrandAnimation[];
};

/** Adjust existing header loops without seeking, restarting or owning their pause state. */
export function createBrandHoverMotion(source: BrandAnimationSource) {
  const requested = new Map<BrandAnimation, number>();
  let disposed = false;

  const setRate = (animation: BrandAnimation, rate: number) => {
    if (
      requested.get(animation) === rate ||
      typeof animation.updatePlaybackRate !== "function"
    )
      return;
    try {
      animation.updatePlaybackRate(rate);
      // The exposed playbackRate can lag a pending update. Remember our intent
      // so a quick leave still replaces a boost that has not committed yet.
      requested.set(animation, rate);
    } catch {
      /* A detached or unsupported animation keeps its existing CSS behavior. */
    }
  };

  return {
    update(boosted: boolean) {
      if (disposed) return;
      let animations: readonly BrandAnimation[] = [];
      try {
        animations = source.getAnimations?.({ subtree: true }) ?? [];
      } catch {
        /* CSS animation remains the fallback when animation inspection fails. */
      }
      const loops = new Set(
        animations.filter(
          (animation) =>
            typeof animation.animationName === "string" &&
            tabletLoops.has(animation.animationName),
        ),
      );
      for (const animation of requested.keys()) {
        if (!loops.has(animation)) {
          setRate(animation, 1);
          requested.delete(animation);
        }
      }
      const rate = boosted ? BRAND_HOVER_PLAYBACK_RATE : 1;
      for (const animation of loops) setRate(animation, rate);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const animation of requested.keys()) setRate(animation, 1);
      requested.clear();
    },
  };
}
