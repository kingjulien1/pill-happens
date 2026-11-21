import type { Ref } from "react";
import { ChevronsDown } from "lucide-react";
import styles from "./notification-pull-indicator.module.css";

export function NotificationPullIndicator({
  ref,
}: {
  ref: Ref<HTMLSpanElement>;
}) {
  return (
    <span
      ref={ref}
      className={styles.indicator}
      data-notification-pull-indicator
      aria-hidden="true"
    >
      <span className={styles.face}>
        <svg className={styles.dial} viewBox="0 0 36 36" fill="none">
          <circle className={styles.track} cx="18" cy="18" r="16" />
          <circle
            className={styles.progress}
            cx="18"
            cy="18"
            r="16"
            pathLength="100"
          />
        </svg>
        <ChevronsDown
          className={styles.glyph}
          data-pull-glyph
          strokeWidth={2.5}
        />
      </span>
      <svg className={styles.burst} viewBox="0 0 40 40" fill="none">
        <circle
          className={styles.ripple}
          data-pull-burst
          cx="20"
          cy="20"
          r="14"
        />
        <g className={styles.rays} data-pull-rays>
          <path d="M20 3v4 M20 33v4 M3 20h4 M33 20h4 M8 8l3 3 M29 29l3 3 M8 32l3-3 M29 11l3-3" />
        </g>
      </svg>
      <span className={styles.caption}>
        <span className={styles.pulling}>Pull to open</span>
        <span className={styles.ready}>Release to open</span>
      </span>
    </span>
  );
}
