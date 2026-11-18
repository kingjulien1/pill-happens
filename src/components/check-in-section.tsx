import type { ReactNode } from "react";
import styles from "./check-in-section.module.css";

export function CheckInSection({
  caption,
  left,
  right,
  children,
}: {
  caption: string;
  left: string;
  right: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <p className={styles.caption}>{caption}</p>
      <div className={styles.frame}>{children}</div>
      <div className={styles.foot}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
