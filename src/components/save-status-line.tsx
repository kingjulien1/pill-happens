"use client";

import { ActionIcon } from "./action-icon";
import styles from "./save-status-line.module.css";

type Tone = "normal" | "saved" | "restored" | "warning";
type Status = { text: string; tone?: Tone };

export function SaveStatusLine({ text, tone = "normal" }: Status) {
  return (
    <span className={styles.line} data-save-status-line="" role="status">
      <span className={styles.caption} data-tone={tone}>
        <ActionIcon
          name={tone === "warning" ? "retry" : "save"}
          className={styles.icon}
        />
        <span className={styles.text}>{text}</span>
      </span>
    </span>
  );
}
