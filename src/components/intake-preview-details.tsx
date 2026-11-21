"use client";

import { useId, useState, type CSSProperties } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { getMedicationBadgePaint } from "@/lib/medication-badge-paint";
import styles from "./intake-form.module.css";

export function IntakePreviewDetails({
  rows,
  disabled = false,
  color,
}: {
  rows: { icon: LucideIcon; text: string }[];
  disabled?: boolean;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const expanded = open && !disabled;
  const id = useId();
  const lines = disabled
    ? []
    : rows.map(({ icon: Icon, text }, index) => (
        <p key={index} className={styles.previewContext}>
          <Icon aria-hidden="true" />
          <span>{text}</span>
        </p>
      ));
  return (
    <div
      className={styles.detailsStack}
      data-open={expanded}
      data-disabled={disabled}
      style={
        color
          ? ({
              "--preview-accent": color,
              "--preview-toggle-ink": getMedicationBadgePaint(color).surface,
            } as CSSProperties)
          : undefined
      }
    >
      {lines.slice(0, 2)}
      {!disabled && (
        <div
          id={id}
          className={styles.extraDetails}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div>
            <div className={styles.extraRows}>{lines.slice(2)}</div>
          </div>
        </div>
      )}
      <div className={styles.disclosureRow}>
        {!expanded && !disabled && (
          <div aria-hidden="true" className={styles.disclosureHint}>
            {lines[2]}
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={expanded}
          aria-controls={disabled ? undefined : id}
          className={styles.detailsToggle}
          onClick={() => setOpen(!expanded)}
        >
          {expanded ? "Fewer details" : "More details"}{" "}
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
