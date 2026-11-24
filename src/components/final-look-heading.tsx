"use client";

import { FinalLookEye } from "./final-look-eye";
import { useFinalLookScroll } from "./use-final-look-scroll";
import { getMedicationColor } from "@/lib/medication-appearance";
import styles from "./medication-appearance-fields.module.css";
import headingStyles from "./final-look-heading.module.css";

export function FinalLookHeading({
  id,
  showIcon = false,
  color,
  motion = true,
}: {
  id: string;
  showIcon?: boolean;
  color?: ReturnType<typeof getMedicationColor>;
  motion?: boolean;
}) {
  const ref = useFinalLookScroll(motion);
  return (
    <div
      ref={ref}
      className={headingStyles.heading}
      data-final-look-heading
      data-motion={motion ? "scroll" : "static"}
    >
      <span className={headingStyles.line} aria-hidden="true" />
      <div
        className={`${styles.titlePill} ${headingStyles.badge}`}
        data-preview-title-pill
      >
        <h3 id={id}>
          {showIcon && <FinalLookEye />}
          Final Look
        </h3>
        <span aria-hidden="true" className={styles.titleSeparator} />
        <span className={styles.liveLabel}>
          {color && (
            <span
              className={styles.liveDot}
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
