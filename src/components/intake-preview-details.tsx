"use client";

import { useId, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import styles from "./intake-form.module.css";

export function IntakePreviewDetails({ rows }: { rows: { icon: LucideIcon; text: string }[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const lines = rows.map(({ icon: Icon, text }, index) => (
    <p key={index} className={styles.previewContext}>
      <Icon aria-hidden="true" /><span>{text}</span>
    </p>
  ));
  return (
    <div className={styles.detailsStack} data-open={open}>
      {lines.slice(0, 2)}
      <div className={styles.disclosureRow}>
        {lines[2]}
        <button type="button" aria-expanded={open} aria-controls={id}
          className={styles.detailsToggle} onClick={() => setOpen(!open)}>
          {open ? "Fewer details" : "More details"} <ChevronDown size={12} aria-hidden="true" />
        </button>
      </div>
      <div id={id} className={styles.extraDetails} aria-hidden={!open}>
        <div><div className={styles.extraRows}>{lines.slice(3)}</div></div>
      </div>
    </div>
  );
}
