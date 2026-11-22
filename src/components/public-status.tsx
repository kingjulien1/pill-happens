import type { ReactNode } from "react";
import styles from "./public-status.module.css";

/** Sign-in handoffs and unavailable pages keep the same canvas and type scale. */
export function PublicStatus({
  icon,
  context,
  title,
  children,
  actions,
  live = false,
}: {
  icon: ReactNode;
  context: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  live?: boolean;
}) {
  return (
    <main className={styles.page}>
      <span className={styles.symbol} aria-hidden="true">
        {icon}
      </span>
      <p className={styles.context}>{context}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description} role={live ? "status" : undefined}>
        {children}
      </p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </main>
  );
}
