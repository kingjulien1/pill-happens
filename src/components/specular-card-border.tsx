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
