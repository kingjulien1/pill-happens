import type { CSSProperties } from "react";
import styles from "./card-icon-settle.module.css";

/** A brief, quiet response when the main artwork reaches its resting pose. */
export function CardIconSettle({
  owner = "medication",
}: {
  owner?: "medication" | "check-in";
}) {
  return (
    <span
      className={styles.effect}
      data-card-icon-response={owner}
      aria-hidden="true"
    >
      <span className={`${styles.part} ${styles.halo}`} />
      <span className={`${styles.part} ${styles.ring}`} />
      <span className={`${styles.part} ${styles.echo}`} />
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={styles.sparkAxis}
          style={{ "--settle-spark-index": index } as CSSProperties}
        >
          <span className={`${styles.part} ${styles.spark}`} />
        </span>
      ))}
    </span>
  );
}
