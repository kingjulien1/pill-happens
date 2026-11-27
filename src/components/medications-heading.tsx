"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { MedicationHeadingBottle } from "@/components/medication-heading-bottle";
import { medicationKitPalette } from "@/lib/medication-kit-preview";
import type { Intake, Medication } from "@/lib/domain";
import modalStyles from "./responsive-modal.module.css";
import checkInStyles from "./daily-check-in.module.css";
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
  const description = `${medications.length} saved ${medications.length === 1 ? "medication" : "medications"}, ${activeCount} in rotation${palette.length ? `. Accent colors: ${palette.map((color) => color.label).join(", ")}.` : "."}`;

  return (
    <PageHeading
      title="Medications"
      titleClassName={modalStyles.title}
      subtitle={
        <p className={checkInStyles.headerDate}>
          {medications.length ? "Tap to edit" : "Add your first"}
          <small>
            <span aria-hidden="true">/</span>{" "}
            {medications.length ? "Hold for actions" : "Set defaults"}
          </small>
        </p>
      }
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
          {palette.length > 0 && (
            <MedicationPaletteBars palette={palette.slice(0, 6)} />
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
      Keep frequently used medications in rotation. Bench one when you take a
      break, then bring it back with its defaults and history intact.
    </PageHeading>
  );
}

export type RotationFilter = "rotation" | "bench" | null;

export function MedicationListHeading({
  count,
  activeCount,
  archivedCount,
  filter,
  onFilter,
}: {
  count: number;
  activeCount: number;
  archivedCount: number;
  filter: RotationFilter;
  onFilter: (filter: RotationFilter) => void;
}) {
  return (
    <div className={styles.listHeading} data-medications-list-heading>
      <h2 className={styles.listTitle}>
        <strong className={styles.listCount}>{count}</strong>{" "}
        {count === 1 ? "Medication" : "Medications"}
      </h2>
      <div
        className={styles.statusSummary}
        role="group"
        aria-label="Filter medications by rotation"
        data-medications-status-summary
      >
        {(["rotation", "bench"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            aria-controls="medication-library-list"
            data-rotation-filter={key}
            onClick={() => onFilter(filter === key ? null : key)}
          >
            <strong>{key === "rotation" ? activeCount : archivedCount}</strong>
            {key === "rotation" ? "In rotation" : "Benched"}
          </button>
        ))}
      </div>
    </div>
  );
}
