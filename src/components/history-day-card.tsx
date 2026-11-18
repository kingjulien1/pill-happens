"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  MedicationCardBackground,
  MedicationCardIcon,
} from "@/components/medication-card-base";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { formatDose, type AppData } from "@/lib/domain";
import { useHistoryCardSummary } from "@/components/use-history-card-summary";
import { cn } from "@/lib/utils";
import styles from "./history-day-card.module.css";
import frameStyles from "./card-frame.module.css";
import layoutStyles from "./card-layout.module.css";

export function HistoryDayCard({
  data,
  day,
  entryAnimation = true,
}: {
  data: AppData;
  day: string;
  entryAnimation?: boolean;
}) {
  const {
    fullDate,
    label,
    color,
    first,
    last,
    firstMedication,
    uniqueCount,
    entryCount,
    morningOnly,
    checkInTitle,
    checkInSummary,
    counts,
    recordSummary,
    pillSummary,
    weekday,
    shortWeekday,
    shortDate,
  } = useHistoryCardSummary(data, day);

  return (
    <article
      className={styles.card}
      style={
        {
          "--entry-color": color.hex,
          "--entry-icon-tint": `${color.hex}66`,
        } as CSSProperties
      }
      aria-label={fullDate}
      data-card-entry={entryAnimation || undefined}
      data-history-card={day}
      data-history-row
      data-first-taken={first?.takenAt}
      data-last-taken={last?.takenAt}
    >
      <Link
        href={`/history/${day}`}
        className={cn(
          "medication-card-base intake-log-card",
          frameStyles.card,
          layoutStyles.card,
          styles.dayLink,
        )}
        aria-label={label}
        title={label}
        data-history-day-link
      >
        <MedicationCardBackground />
        <span
          className={frameStyles.detailRim}
          data-card-rim-detail
          aria-hidden="true"
        />
        <div
          className={cn(
            "medication-card-content intake-card-content",
            styles.content,
          )}
        >
          <MedicationCardIcon
            color={color.value}
            icon={first ? firstMedication?.icon : morningOnly ? "sun" : "moon"}
            iconRotation={firstMedication?.iconRotation}
            title={
              first
                ? (firstMedication?.name ?? first.medicationName)
                : checkInTitle
            }
            data-history-icon-entrance
            data-history-medication-stack
            data-unique-medications={uniqueCount}
            data-history-medication-id={first?.medicationId}
            data-history-missing-medication={
              (first && !firstMedication) || undefined
            }
            data-history-empty-artwork={!first || undefined}
          />
          <div className="medication-card-details intake-card-details">
            <div
              className={cn(
                "medication-card-heading intake-card-heading",
                styles.heading,
              )}
              data-history-header
            >
              <div className={cn("intake-card-title-group", styles.date)}>
                <time
                  className={cn("intake-card-time", styles.calendarDate)}
                  dateTime={day}
                  aria-label={fullDate}
                  title={fullDate}
                  data-history-date
                >
                  {shortDate}
                </time>
                <span className={styles.dateSeparator} aria-hidden="true">
                  ·
                </span>
                <h3 className="intake-card-name" data-history-weekday>
                  <span className={styles.weekdayLong}>{weekday}</span>
                  <span className={styles.weekdayShort}>{shortWeekday}</span>
                </h3>
              </div>
              <span
                className={styles.counts}
                role="img"
                aria-label={pillSummary}
                title={pillSummary}
                data-pill-counts
                data-pills={counts.pills}
                data-benzos={counts.benzos}
              >
                {(
                  [
                    ["pills", counts.pills],
                    ["benzodiazepine", counts.benzos],
                  ] as const
                ).map(([kind, count]) => (
                  <span
                    className={styles.metric}
                    key={kind}
                    data-count-part={kind}
                  >
                    <MedicationIndicatorMark
                      kind={kind}
                      size={18}
                      aria-hidden="true"
                    />
                    <strong
                      className={cn("intake-card-total-value", styles.number)}
                      title={formatDose(count)}
                    >
                      {formatDose(count)}
                    </strong>
                  </span>
                ))}
              </span>
            </div>
            <div
              className="medication-card-bottom intake-card-bottom"
              data-history-summary
            >
              <span
                className={cn("intake-card-ingredient", styles.summary)}
                title={`${recordSummary} · ${checkInSummary}`}
              >
                <span data-history-records>
                  <strong data-history-log-count>{entryCount}</strong>{" "}
                  <span data-history-record-label="logs">Logs</span>
                  <span className={styles.recordSeparator} aria-hidden="true">
                    {" "}
                    ·{" "}
                  </span>
                  <strong data-history-medication-count>
                    {uniqueCount}
                  </strong>{" "}
                  <span data-history-record-label="meds">Meds</span>
                </span>
                <span className={styles.recordSeparator} aria-hidden="true">
                  {" "}
                  ·{" "}
                </span>
                <span data-history-check-in-summary>{checkInSummary}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
