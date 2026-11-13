import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./page-layout.module.css";

/** A common opening for collection pages; daily timelines keep their compact opening. */
export function PageHeading({
  title,
  context,
  icon,
  actions,
  children,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  context?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      {...props}
      className={cn(styles.heading, className)}
      data-page-heading
    >
      <div className={styles.headingRow} data-page-heading-row>
        <div className={styles.identity}>
          {icon && (
            <span className={styles.headingIcon} aria-hidden="true">
              {icon}
            </span>
          )}
          <div className={styles.headingCopy}>
            {context && <p className={styles.context}>{context}</p>}
            <h1 className={styles.title} data-page-heading-title>
              {title}
            </h1>
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children && (
        <p className={styles.description} data-page-heading-description>
          {children}
        </p>
      )}
    </header>
  );
}

/** The same quiet card surface for empty states and supporting page sections. */
export function PageSurface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn(styles.surface, className)} />;
}
