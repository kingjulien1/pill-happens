import type { ReactNode } from "react";
import styles from "./check-in-section.module.css";

type CheckInSectionHeaderProps = {
  caption: ReactNode;
  context?: string;
  detail: ReactNode;
  headingId?: string;
  headingAtEnd?: boolean;
  description?: ReactNode;
};

export function CheckInSectionHeader({
  caption,
  context,
  detail,
  headingId,
  headingAtEnd = false,
  description,
}: CheckInSectionHeaderProps) {
  const heading = (
    <div className={styles.labelRow}>
      {headingId ? (
        <h3 id={headingId} className={styles.title}>
          {caption}
        </h3>
      ) : (
        <strong className={styles.title}>{caption}</strong>
      )}
      {context && (
        <span className={styles.contextGroup}>
          <span aria-hidden="true">/</span>
          <span className={styles.context}>{context}</span>
        </span>
      )}
    </div>
  );
  return (
    <div className={styles.header}>
      <div className={styles.caption}>
        {!headingAtEnd && heading}
        <span className={styles.detail}>{detail}</span>
        {headingAtEnd && heading}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}

export function CheckInSection({
  children,
  recap = false,
  ...header
}: CheckInSectionHeaderProps & { children: ReactNode; recap?: boolean }) {
  return (
    <div className={styles.section} data-recap={recap || undefined}>
      <CheckInSectionHeader {...header} />
      <div className={styles.frame}>{children}</div>
    </div>
  );
}
