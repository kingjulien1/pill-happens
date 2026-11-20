import type { ReactNode } from "react";
import styles from "./daily-check-in.module.css";

export function JournalDialogSubheading({ title, detail }: { title: ReactNode; detail: ReactNode }) {
  return (
    <span className={styles.headerDate}>
      {title}
      <small><span aria-hidden="true">/</span> {detail}</small>
    </span>
  );
}
