import type { ReactNode } from "react";
import styles from "./evening-reflection-panel.module.css";

export function EveningReflectionPanel({
  kind,
  headingId,
  title,
  icon,
  detail,
  children,
}: {
  kind: "feelings" | "ratings";
  headingId: string;
  title: string;
  icon: ReactNode;
  detail: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={styles.panel}
      data-reflection-panel={kind}
      data-mood-library={kind === "feelings" ? "" : undefined}
      data-evening-day-ratings={kind === "ratings" ? "" : undefined}
      data-check-in-section={kind === "feelings" ? "mood" : undefined}
      aria-labelledby={headingId}
    >
      <div className={styles.heading}>
        <h4 id={headingId}>
          {icon}
          {title}
        </h4>
        <div className={styles.detail}>{detail}</div>
      </div>
      {children}
    </section>
  );
}
