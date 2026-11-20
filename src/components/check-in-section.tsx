import type { ReactNode } from "react";
import styles from "./check-in-section.module.css";

export function CheckInSection({
  caption,
  context,
  detail,
  headingId,
  description,
  children,
}: {
  caption: ReactNode;
  context?: string;
  detail: ReactNode;
  headingId?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.caption}>
          <div className={styles.labelRow}>
            {headingId ? (
              <h3 id={headingId} className={styles.title}>
                {caption}
              </h3>
            ) : (
              <strong className={styles.title}>{caption}</strong>
            )}
            {context && (
              <>
                <span aria-hidden="true">/</span>
                <span className={styles.context}>{context}</span>
              </>
            )}
          </div>
          <span className={styles.detail}>{detail}</span>
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.frame}>{children}</div>
    </div>
  );
}
