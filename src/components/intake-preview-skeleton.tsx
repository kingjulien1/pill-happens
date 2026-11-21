"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { SquareDashed } from "lucide-react";
import { MedicationCardBase } from "./medication-card-base";
import { MedicationCardIconFrame } from "./medication-card-icon";
import styles from "./intake-preview-skeleton.module.css";

function SkeletonLine({ phase = 0 }: { phase?: number }) {
  return (
    <span
      className={styles.line}
      data-skeleton-line
      style={{ "--line-phase": `${phase}s` } as CSSProperties}
    >
      <span className={styles.segments}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.lineSheen} />
    </span>
  );
}

/** Real card geometry, with no invented medication or dose in the empty draft. */
export function IntakePreviewSkeleton() {
  const scene = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const card = scene.current?.closest<HTMLElement>(
      "[data-intake-preview-skeleton]",
    );
    if (!card) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver !== "function";
    const sync = () => {
      card.dataset.skeletonMotion =
        visible &&
        !document.hidden &&
        !reduced.matches &&
        !card.closest('[inert], [aria-hidden="true"], [data-closed]')
          ? "active"
          : "paused";
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
          })
        : null;
    observer?.observe(card);
    const modal = new MutationObserver(sync);
    for (
      let parent = card.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      modal.observe(parent, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "data-closed"],
      });
    }
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    if (!observer) sync();
    return () => {
      observer?.disconnect();
      modal.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);
  return (
    <MedicationCardBase
      readOnly
      color="tw-neutral-400"
      data-intake-card=""
      data-intake-preview-skeleton
      data-skeleton-motion="paused"
      aria-label="Intake preview. Choose a medication to see your entry."
      className={styles.skeleton}
      decoration={
        <span ref={scene} className={styles.scene} aria-hidden="true">
          <span className={styles.wash} />
          <span className={styles.grid} />
          <span className={styles.scan} data-skeleton-scan />
          <svg
            className={styles.trace}
            data-skeleton-trace
            width="100%"
            height="100%"
            fill="none"
          >
            <rect
              className={styles.traceTrail}
              x="3"
              y="3"
              rx="18"
              pathLength="100"
            />
            <rect
              className={styles.traceHead}
              x="3"
              y="3"
              rx="18"
              pathLength="100"
            />
          </svg>
        </span>
      }
      leadingArtwork={
        <span
          className="medication-card-focus intake-card-focus"
          aria-hidden="true"
        >
          <MedicationCardIconFrame
            color="tw-neutral-400"
            className={styles.iconFrame}
            data-skeleton-artwork
          >
            <span className={styles.iconStage}>
              <span className={styles.iconRipple} />
              <span className={styles.iconRippleSecond} />
              <span className={styles.iconCore} />
              <SquareDashed className={styles.icon} data-skeleton-glyph />
              <span className={styles.sparks}>
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          </MedicationCardIconFrame>
        </span>
      }
    >
      <div
        className="medication-card-details intake-card-details"
        aria-hidden="true"
      >
        <div className={styles.heading}>
          <SkeletonLine />
          <SkeletonLine phase={0.2} />
        </div>
        <div className={styles.bottom}>
          <SkeletonLine phase={0.45} />
        </div>
      </div>
    </MedicationCardBase>
  );
}
