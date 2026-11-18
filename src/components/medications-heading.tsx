"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { MedicationHeadingBottle } from "@/components/medication-heading-bottle";
import { medicationKitPalette } from "@/lib/medication-kit-preview";
import type { Intake, Medication } from "@/lib/domain";
import styles from "./medications-heading.module.css";

const SWATCH_WIDTH = 8;
const SWATCH_GAP = 4;

function MedicationPaletteBars({
  palette,
}: {
  palette: ReturnType<typeof medicationKitPalette>;
}) {
  const preview = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(palette.length);

  useLayoutEffect(() => {
    const node = preview.current;
    if (!node) return;
    const fit = () =>
      setVisibleCount(
        Math.min(
          palette.length,
          Math.max(
            0,
            Math.floor(
              (node.clientWidth + SWATCH_GAP) / (SWATCH_WIDTH + SWATCH_GAP),
            ),
          ),
        ),
      );
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [palette.length]);

  return (
    <span
      ref={preview}
      className={styles.preview}
      aria-hidden="true"
      data-kit-preview
    >
      {palette.slice(0, visibleCount).map((color) => (
        <span
          key={color.hex}
          className={styles.swatch}
          style={{ backgroundColor: color.hex }}
          title={color.label}
          data-kit-color={color.value}
        />
      ))}
    </span>
  );
}

export function MedicationsHeading({
  medications,
  intakes,
  dialogOpen = false,
}: {
  medications: Medication[];
  intakes: Intake[];
  dialogOpen?: boolean;
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
      className={styles.heading}
      icon={<MedicationHeadingBottle paused={dialogOpen} />}
      data-medications-heading
      data-medications-title-row
      data-kit-count-wide={displayedCount.length > 1 || undefined}
      data-kit-count-long={displayedCount.length > 2 || undefined}
      actions={
        <span
          className={styles.summary}
          aria-label={description}
          title={description}
          role="img"
          data-medications-total
        >
          {palette.length > 0 && <MedicationPaletteBars palette={palette} />}
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
  count,
  activeCount,
  archivedCount,
}: {
  count: number;
  activeCount: number;
  archivedCount: number;
}) {
  return (
    <div className={styles.listHeading} data-medications-list-heading>
      <h2 className={styles.listTitle}>
        <strong className={styles.listCount}>{count}</strong>{" "}
        {count === 1 ? "Medication" : "Medications"}
      </h2>
      <span className={styles.statusSummary} data-medications-status-summary>
        <span>
          <strong>{activeCount}</strong> active
        </span>
        <span aria-hidden="true">/</span>
        <span>
          <strong>{archivedCount}</strong> archived
        </span>
      </span>
    </div>
  );
}
