"use client";

import { FinalLookEye } from "./final-look-eye";
import { useFinalLookScroll } from "./use-final-look-scroll";
import { useVisibleMotion } from "./use-visible-motion";
import { getMedicationColor } from "@/lib/medication-appearance";
import styles from "./medication-appearance-fields.module.css";
import headingStyles from "./final-look-heading.module.css";

export function FinalLookHeading({
  id,
  showIcon = false,
  color,
  motion = true,
  receiptGlow = false,
}: {
  id: string;
  showIcon?: boolean;
  color?: ReturnType<typeof getMedicationColor>;
  motion?: boolean;
  receiptGlow?: boolean;
}) {
  const ref = useFinalLookScroll(motion);
  const badge = useVisibleMotion<HTMLDivElement>(receiptGlow);
  return (
    <div
      ref={ref}
      className={headingStyles.heading}
      data-final-look-heading
      data-motion={motion ? "scroll" : "static"}
    >
      <span className={headingStyles.line} aria-hidden="true" />
      <div
        ref={badge}
        className={`${styles.titlePill} ${headingStyles.badge}`}
        data-preview-title-pill
      >
        {receiptGlow && (
          <span className={headingStyles.glow} aria-hidden="true">
            <svg width="100%" height="100%" focusable="false">
              <rect
                width="100%"
                height="100%"
                pathLength="100"
                strokeDasharray="6 81 13 0"
                strokeWidth="5"
                opacity=".55"
              />
              <rect
                width="100%"
                height="100%"
                pathLength="100"
                strokeDasharray="5 95"
                strokeWidth="8"
              />
            </svg>
          </span>
        )}
        <h3 id={id}>
          {showIcon && <FinalLookEye />}
          Final Look
        </h3>
        <span aria-hidden="true" className={styles.titleSeparator} />
        <span className={styles.liveLabel}>
          {color && (
            <span
              className={`${styles.liveDot} motion-safe:animate-pulse motion-safe:before:animate-ping`}
              style={{ backgroundColor: color.hex }}
              role="img"
              aria-label={color.label}
              title={color.label}
            />
          )}
          Live Preview
        </span>
      </div>
      <span className={headingStyles.line} aria-hidden="true" />
    </div>
  );
}
