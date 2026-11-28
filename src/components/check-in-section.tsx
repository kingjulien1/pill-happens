import type { ReactNode } from "react";
import styles from "./check-in-section.module.css";

type CheckInSectionHeaderProps = {
  caption: ReactNode;
  context?: ReactNode;
  contextSeparator?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  headingId?: string;
  description?: ReactNode;
};

export function CheckInSectionHeader({
  caption,
  context,
  contextSeparator = "/",
  detail,
  action,
  headingId,
  description,
}: CheckInSectionHeaderProps) {
  return (
    <div className={styles.header} data-has-action={action ? "" : undefined}>
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
            <span className={styles.contextGroup}>
              <span aria-hidden="true">{contextSeparator}</span>
              <span className={styles.context}>{context}</span>
            </span>
          )}
        </div>
        {detail != null && <span className={styles.detail}>{detail}</span>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
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
