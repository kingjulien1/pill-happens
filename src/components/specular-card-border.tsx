import { useId } from "react";
import { cn } from "@/lib/utils";
import styles from "./specular-card-border.module.css";

/** Static mobile paint belongs inside the button; desktop keeps its Safari-safe sibling. */
export function SpecularCardBorder({ desktop = false }: { desktop?: boolean }) {
  if (desktop)
    return (
      <svg
        className={cn(styles.border, styles.desktop)}
        aria-hidden="true"
        focusable="false"
        data-specular-card-border="desktop"
      >
        <rect width="100%" height="100%" className={styles.track} />
        <rect
          width="100%"
          height="100%"
          className={styles.highlight}
          pathLength="100"
        />
      </svg>
    );

  return (
    <span
      className={cn(styles.border, styles.frame)}
      data-specular-frame
      data-specular-card-border="mobile"
      aria-hidden="true"
    />
  );
}

/** The launcher's track and moving reflection share one rounded perimeter. */
export function IntakeSpecularBorder() {
  const palette = useId();
  return (
    <svg className={styles.launchRim} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={palette} x1="0%" y1="0%" x2="100%" y2="75%">
          <stop stopColor="#ffc18c" />
          <stop offset=".18" stopColor="#f2a0a9" />
          <stop offset=".38" stopColor="#ae6097" />
          <stop offset=".56" stopColor="#d28ce7" />
          <stop offset=".76" stopColor="#9877ce" />
          <stop offset=".91" stopColor="#c2a1ef" />
          <stop offset="1" stopColor="#f8c4b2" />
        </linearGradient>
      </defs>
      <rect stroke={`url(#${palette})`} />
      <rect className={styles.launchGlint} pathLength="100" />
    </svg>
  );
}
