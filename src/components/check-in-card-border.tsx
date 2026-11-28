import { CheckInCardRim } from "./check-in-card-rim";
import { cn } from "@/lib/utils";
import styles from "./check-in-card-border.module.css";

/** Mobile paint belongs inside the button; desktop paint is its Safari-safe sibling. */
export function CheckInCardBorder({
  desktop = false,
  palette,
}: {
  desktop?: boolean;
  palette?: "sky-indigo";
}) {
  if (palette === "sky-indigo")
    return (
      <span
        className={cn(styles.border, styles.frame, styles.skyIndigo)}
        aria-hidden="true"
      />
    );

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
    >
      <CheckInCardRim palette="triad" glow={false} className={styles.light} />
    </span>
  );
}
