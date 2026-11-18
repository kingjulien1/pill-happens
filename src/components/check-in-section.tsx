import type { ReactNode } from "react";
import styles from "./check-in-section.module.css";

export function CheckInSection({
  caption,
  context,
  detail,
  left,
  right,
  children,
}: {
  caption: string;
  context: string;
  detail: string;
  left: string;
  right: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <p className={styles.caption}>
        <strong>{caption}</strong>
        <span aria-hidden="true">/</span>
        <span>{context}</span>
        <span className={styles.detail}>{detail}</span>
      </p>
      <div className={styles.frame}>{children}</div>
      <div className={styles.foot}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
