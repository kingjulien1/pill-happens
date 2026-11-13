"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  MedicationCardBackground,
  MedicationCardIcon,
} from "@/components/medication-card-base";
import { PageSurface } from "@/components/page-heading";
import { formatDose, type Medication } from "@/lib/domain";
import type { MedicationRecordStats } from "@/lib/journal-reference-details";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationType } from "@/lib/medication-types";
import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";
import styles from "./journal-reference-details.module.css";

export function ReferenceBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={styles.back}>
      <ArrowLeft size={14} aria-hidden="true" />
      {children}
    </Link>
  );
}

/** A finite arrival and one quiet shared loop; unseen or curtained art stays parked. */
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
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      node.dataset.detailMotion =
        visible &&
        !document.hidden &&
        getPageEntryReadiness() &&
        !reduced.matches
          ? "running"
          : "paused";
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              sync();
            },
            { threshold: 0.05 },
          )
        : null;
    if (observer) observer.observe(node);
    else {
      visible = true;
      sync();
    }
    const unsubscribe = subscribePageEntryReadiness(sync);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer?.disconnect();
      unsubscribe();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);
  return (
    <div
      ref={root}
      className={styles.hero}
      data-card-entry
      data-reference-hero
      data-detail-motion="paused"
    >
      <span className={styles.heroWash} aria-hidden="true" />
      <div className={styles.heroStage} aria-hidden="true">
        <span className={styles.heroHalo} />
        <span className={styles.heroOrbit} />
        <span className={styles.heroArrival}>
          <span className={styles.heroFloat}>{artwork}</span>
        </span>
        {[
          [-64, -29],
          [51, -48],
          [70, 18],
          [35, 57],
          [-47, 52],
          [-73, 5],
        ].map(([x, y], index) => (
          <i
            key={index}
            className={styles.heroParticle}
            style={
              {
                "--burst-x": `${x}px`,
                "--burst-y": `${y}px`,
                "--burst-delay": `${index * 32}ms`,
              } as CSSProperties
            }
          />
        ))}
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
    <PageSurface className={styles.panel} data-card-entry>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.body}>{children}</p>
    </PageSurface>
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
