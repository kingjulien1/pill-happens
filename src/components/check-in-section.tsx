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
      {children}
      <div className={styles.foot}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
