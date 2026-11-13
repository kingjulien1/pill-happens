"use client";

import { PageHeading } from "@/components/page-heading";
import { PillBottle } from "lucide-react";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/ssr/FolderOpen";
import { FolderSimpleIcon } from "@phosphor-icons/react/dist/ssr/FolderSimple";
import { ActionIcon } from "@/components/action-icon";
import { Toggle } from "@/components/ui/toggle";
import { medicationKitPalette } from "@/lib/medication-kit-preview";
import type { Intake, Medication } from "@/lib/domain";
import styles from "./medications-heading.module.css";

export function MedicationsHeading({
  medications,
  intakes,
}: {
  medications: Medication[];
  intakes: Intake[];
}) {
  const activeCount = medications.filter(
    (medication) => !medication.archived,
  ).length;
  const palette = medicationKitPalette(medications, intakes);
  const displayedCount = new Intl.NumberFormat("en", {
    notation: medications.length >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(medications.length);
  const description = `${medications.length} saved ${medications.length === 1 ? "medication" : "medications"}, ${activeCount} active${palette.length ? `. Accent colors: ${palette.map((color) => color.label).join(", ")}.` : "."}`;

  return (
    <PageHeading
      title="Medications"
      context="Your medication kit"
      icon={<PillBottle strokeWidth={2.25} />}
      data-medications-heading
      data-medications-title-row
      actions={
        <span
          className={styles.summary}
          aria-label={description}
          title={description}
          role="img"
          data-medications-total
        >
          {palette.length > 0 && (
            <span
              className={styles.preview}
              aria-hidden="true"
              data-kit-preview
            >
              {palette.map((color) => (
                <span
                  key={color.hex}
                  className={styles.swatch}
                  style={{ backgroundColor: color.hex }}
                  title={color.label}
                  data-kit-color={color.value}
                />
              ))}
            </span>
          )}
          <span className={styles.total} aria-hidden="true">
            <span className={styles.count} data-kit-count>
              {displayedCount}
            </span>
            <span className={styles.countLabel}>Meds</span>
          </span>
        </span>
      }
    >
      Keep names, strengths, and familiar symbols together. Your defaults make
      each intake quicker to log and easier to review.
    </PageHeading>
  );
}

export function MedicationListHeading({
  archived,
  count,
  onArchivedChange,
}: {
  archived: boolean;
  count: number;
  onArchivedChange: (archived: boolean) => void;
}) {
  return (
    <div
      className="canvas-copy mb-4 flex min-w-0 items-center justify-between gap-3"
      data-medications-list-heading
    >
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        <ActionIcon
          name={archived ? "archive" : "sparkle"}
          className="size-4"
        />
        <h2 className="text-sm font-medium">
          {archived ? "Archived" : "Active"}
        </h2>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{count}</span>
          <span className="hidden min-[360px]:inline">
            {count === 1 ? "medication" : "medications"}
          </span>
        </span>
      </div>
      <span className="sr-only" role="status">
        {count} {archived ? "archived" : "active"}{" "}
        {count === 1 ? "medication" : "medications"}.
      </span>
      <Toggle
        pressed={archived}
        onPressedChange={onArchivedChange}
        aria-label="Active / Archive Medications"
        aria-description="Switch between active and archived medication lists. Pressed shows the archive."
        aria-controls="medication-library-list"
        className="medication-archive-toggle h-11 shrink-0 rounded-xl p-0"
        data-medications-filter
      >
        <span aria-hidden="true" className="medication-archive-face">
          <span className="medication-archive-icons">
            <FolderOpenIcon weight="bold" className="medication-archive-open" />
            <FolderSimpleIcon
              weight="bold"
              className="medication-archive-closed"
            />
          </span>
          <span className="medication-archive-labels">
            <span className="medication-archive-active">Active</span>
            <span className="medication-archive-archived">Archive</span>
          </span>
          <span className="medication-archive-indicator" />
        </span>
      </Toggle>
    </div>
  );
}
