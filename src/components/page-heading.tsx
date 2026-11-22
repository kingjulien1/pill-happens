import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./page-layout.module.css";

/** A common opening for collection pages; daily timelines keep their compact opening. */
export function PageHeading({
  title,
  context,
  subtitle,
  titleClassName,
  icon,
  actions,
  children,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  context?: ReactNode;
  subtitle?: ReactNode;
  titleClassName?: string;
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
        <div className={styles.identity} data-page-heading-identity>
          {icon && (
            <span
              className={styles.headingIcon}
              aria-hidden="true"
              data-page-heading-icon
            >
              {icon}
            </span>
          )}
          <div className={styles.headingCopy}>
            {context && (
              <p
                className={styles.context}
                title={typeof context === "string" ? context : undefined}
              >
                {context}
              </p>
            )}
            <h1
              className={titleClassName ?? styles.title}
              data-page-heading-title
            >
              {title}
            </h1>
            {subtitle}
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

/** Empty collections and missing details share one readable, quiet state. */
export function PageEmptyState({
  icon,
  title,
  children,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <PageSurface {...props} className={cn(styles.empty, className)}>
      {icon && (
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className={styles.emptyTitle}>{title}</h2>
      <div className={styles.emptyDescription}>{children}</div>
    </PageSurface>
  );
}
