"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  MedicationCardBackground,
  MedicationCardIcon,
} from "@/components/medication-card-base";
import { PageEmptyState } from "@/components/page-heading";
import { formatDose, type Medication } from "@/lib/domain";
import type { MedicationRecordStats } from "@/lib/journal-reference-details";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationType } from "@/lib/medication-types";
import styles from "./journal-reference-details.module.css";
import { Button } from "@/components/ui/button";

export function ReferenceBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button
      navigation
      variant="ghost"
      size="sm"
      nativeButton={false}
      render={<Link href={href} />}
      className={`${styles.back} h-auto`}
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {children}
    </Button>
  );
}

/** Static reference artwork keeps long medication histories inexpensive to browse. */
export function ReferenceHero({
  artwork,
  eyebrow,
  title,
  children,
}: {
  artwork: ReactNode;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.hero} data-card-entry data-reference-hero>
      <span className={styles.heroWash} aria-hidden="true" />
      <div className={styles.heroStage} aria-hidden="true">
        <span className={styles.heroHalo} />
        <span className={styles.heroOrbit} />
        <span className={styles.heroArrival}>
          <span className={styles.heroFloat}>{artwork}</span>
        </span>
      </div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <p className={styles.heroTitle}>{title}</p>
      {children && <p className={styles.heroDescription}>{children}</p>}
    </div>
  );
}

export function ReferenceMetrics({
  items,
}: {
  items: { value: ReactNode; label: string }[];
}) {
  return (
    <dl className={styles.metrics} data-card-entry data-reference-metrics>
      {items.map(({ value, label }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReferenceEmpty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PageEmptyState title={title} data-card-entry>
      {children}
    </PageEmptyState>
  );
}

export function quantitySummary(record: MedicationRecordStats) {
  return record.quantities
    .map(
      ({ quantity, unit, units }) =>
        `${formatDose(quantity)} ${quantity === 1 ? unit : units}`,
    )
    .join(" · ");
}

/** Native card links share the daily log's paint and saved vector artwork. */
export function ReferenceMedicationCard({
  record,
  featured = false,
}: {
  record: MedicationRecordStats;
  featured?: boolean;
}) {
  const medication = record.medication;
  const color = getMedicationColor(medication?.color);
  const body = (
    <>
      <MedicationCardBackground />
      <div className={styles.medicationContent}>
        <MedicationCardIcon
          color={color.value}
          icon={medication?.icon}
          iconRotation={medication?.iconRotation}
        />
        <div className={styles.medicationCopy}>
          <div className={styles.medicationHeading}>
            <strong>{record.name}</strong>
          </div>
          <div className={styles.medicationSubline}>
            <span title={medication?.activeIngredient?.trim()}>
              {medication?.activeIngredient?.trim() ||
                (record.count
                  ? quantitySummary(record)
                  : `${formatDose(medication?.strengthMg ?? 0)} mg / ${getMedicationType(medication?.form).unit}`)}
            </span>
            {medication?.archived && (
              <span className={styles.archive}>Archived</span>
            )}
            {!medication && (
              <span className={styles.archive}>Saved history</span>
            )}
          </div>
        </div>
        <span
          className={styles.medicationAmounts}
          title={quantitySummary(record) || "No recorded intakes"}
        >
          <span>
            <strong>{record.count}</strong>{" "}
            <small>{record.count === 1 ? "intake" : "intakes"}</small>
          </span>
          <span>
            {formatDose(record.totalMg)} <small>mg logged</small>
          </span>
        </span>
        {medication && (
          <ArrowUpRight
            size={15}
            className={styles.cardArrow}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );
  const props = {
    className: `intake-log-card ${styles.medicationCard}`,
    style: {
      "--entry-color": color.hex,
      "--entry-icon-tint": `${color.hex}66`,
    } as CSSProperties,
    "data-card-entry": true,
    "data-reference-medication": record.medicationId,
    "data-featured": featured || undefined,
  };
  return medication ? (
    <Link
      {...props}
      href={`/medications/${encodeURIComponent(medication.id)}`}
      aria-label={`${record.name}${medication.activeIngredient ? `, ${medication.activeIngredient}` : ""}. ${record.count} ${record.count === 1 ? "intake" : "intakes"}; ${quantitySummary(record) || "none logged"}; ${formatDose(record.totalMg)} milligrams logged${medication.archived ? ". Archived" : ""}. View medication.`}
    >
      {body}
    </Link>
  ) : (
    <div {...props}>{body}</div>
  );
}

export function MedicationHeroArtwork({
  medication,
}: {
  medication: Medication;
}) {
  return (
    <MedicationCardIcon
      color={medication.color}
      icon={medication.icon}
      iconRotation={medication.iconRotation}
      className={styles.heroMedication}
    />
  );
}

export function ReferenceSectionHeading({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {detail && <span>{detail}</span>}
    </div>
  );
}
