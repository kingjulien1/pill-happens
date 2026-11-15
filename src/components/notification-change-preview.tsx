"use client";

import type { CSSProperties } from "react";
import {
  ArrowDown,
  BedDouble,
  CalendarDays,
  Clock3,
  Coffee,
  MoonStar,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { MedicationCardIconStack } from "@/components/medication-card-icon";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { MedicationFormGlyph } from "@/components/medication-form-glyph";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationCategory } from "@/lib/medication-categories";
import { getMedicationType } from "@/lib/medication-types";
import { DAILY_MOODS } from "@/lib/daily-check-in";
import { INTAKE_ROUTES } from "@/lib/intake-routes";
import { formatDay, formatDose } from "@/lib/domain";
import type {
  NotificationChangePreview as ChangePreview,
  NotificationMedicationSnapshot,
  NotificationPreviewRecord,
} from "@/lib/notification-change-preview";
import styles from "./notification-change-preview.module.css";

/** Read-only snapshots use the saved artwork, units and category components. */
export function NotificationChangePreview({
  preview,
}: {
  preview: ChangePreview;
}) {
  if (!preview.before && !preview.after) return null;
  const compared = Boolean(preview.before && preview.after);
  return (
    <div className={styles.root} data-notification-change-preview>
      {preview.before && (
        <section aria-label={compared ? "Before change" : "Removed"}>
          <p className={styles.caption}>{compared ? "Before" : "Removed"}</p>
          <RecordPreview record={preview.before} />
        </section>
      )}
      {compared && <ArrowDown className={styles.arrow} aria-hidden="true" />}
      {preview.after && (
        <section aria-label={compared ? "After change" : "Saved"}>
          <p className={styles.caption}>{compared ? "After" : "Saved"}</p>
          <RecordPreview record={preview.after} />
        </section>
      )}
    </div>
  );
}

function Categories({
  medication,
}: {
  medication?: NotificationMedicationSnapshot;
}) {
  const categories = medication?.categories ?? [];
  if (!categories.length) return null;
  return (
    <span
      className={styles.categories}
      aria-label={categories
        .map((category) => getMedicationCategory(category).label)
        .join(", ")}
    >
      {categories.slice(0, 3).map((category) => (
        <MedicationIndicatorMark
          key={category}
          kind={category}
          size={18}
          aria-hidden="true"
        />
      ))}
      {categories.length > 3 && <span>+{categories.length - 3}</span>}
    </span>
  );
}

function MedicationPreview({
  record,
}: {
  record: Extract<NotificationPreviewRecord, { kind: "intake" | "medication" }>;
}) {
  const medication = record.medication;
  const intake = record.kind === "intake";
  const quantity = intake ? record.quantity : record.medication.defaultQuantity;
  const strength = intake ? record.strengthMg : record.medication.strengthMg;
  const form = intake ? record.form : record.medication.form;
  const name = intake ? record.name : record.medication.name;
  const type = getMedicationType(form);
  const color = getMedicationColor(medication?.color);
  const time = intake
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: record.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(record.takenAt))
    : null;
  return (
    <article
      className={styles.card}
      style={{ "--entry-color": color.hex } as CSSProperties}
      data-notification-record={record.kind}
    >
      <MedicationCardIconStack
        color={medication?.color}
        icon={medication?.icon}
        iconRotation={medication?.iconRotation}
        quantity={quantity}
      />
      <div className={styles.copy}>
        <div className={styles.heading}>
          <strong className={styles.name}>{name}</strong>
          <Categories medication={medication} />
        </div>
        <div className={styles.meta}>
          <MedicationFormGlyph
            form={form ?? "other"}
            size={13}
            aria-hidden="true"
          />
          <span>{form ? type.label : "Medicine"}</span>
          {time && (
            <time
              dateTime={record.kind === "intake" ? record.takenAt : undefined}
            >
              {time}
            </time>
          )}
          {!intake && record.medication.archived && (
            <span className={styles.status}>Archived</span>
          )}
          {!intake && !record.medication.archived && (
            <span className={styles.status}>Active</span>
          )}
        </div>
        <div className={styles.bottom}>
          <span className={styles.ingredient}>
            {medication?.activeIngredient?.trim() || "Unspecified"}
          </span>
          <MedicationCardDose
            quantity={quantity}
            strengthMg={strength}
            form={form}
            source={intake ? "recorded" : "default"}
          />
        </div>
        {intake && (
          <span className={styles.date}>
            {new Intl.DateTimeFormat("en", {
              timeZone: record.timeZone,
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(new Date(record.takenAt))}{" "}
            ·{" "}
            {INTAKE_ROUTES.find((route) => route.value === record.route)
              ?.label ?? "Route not recorded"}
          </span>
        )}
      </div>
    </article>
  );
}

function RecordPreview({ record }: { record: NotificationPreviewRecord }) {
  if (record.kind === "intake" || record.kind === "medication")
    return <MedicationPreview record={record} />;
  if (record.kind === "check-in") {
    const moods = DAILY_MOODS.filter((mood) =>
      record.moods.includes(mood.value),
    );
    const Icon = record.period === "morning" ? Coffee : MoonStar;
    return (
      <article
        className={styles.card + " " + styles.simple}
        data-notification-record="check-in"
      >
        <span className={styles.symbol}>
          <Icon aria-hidden="true" />
        </span>
        <div className={styles.copy}>
          <div className={styles.heading}>
            <strong>
              {record.period === "morning" ? "Morning" : "Evening"} Check-In
            </strong>
            <span className={styles.words}>{record.words} words</span>
          </div>
          <p className={styles.meta}>
            {formatDay(record.day, { month: "short", day: "numeric" })}
          </p>
          <div className={styles.metrics}>
            {moods.map((mood) => (
              <span key={mood.value}>
                {mood.emoji} {mood.label}
              </span>
            ))}
            {record.energy !== null && (
              <span
                className={styles.metric}
                role="img"
                aria-label={
                  "Energy " + record.energy + " out of " + record.energyScale
                }
              >
                <Zap aria-hidden="true" />
                {record.energy}/{record.energyScale}
              </span>
            )}
            {record.stress !== null && (
              <span
                className={styles.metric}
                role="img"
                aria-label={
                  "Stress " + record.stress + " out of " + record.stressScale
                }
              >
                <Waves aria-hidden="true" />
                {record.stress}/{record.stressScale}
              </span>
            )}
            {record.sleepHours !== null && (
              <span
                className={styles.metric}
                role="img"
                aria-label={formatDose(record.sleepHours) + " hours of sleep"}
              >
                <BedDouble aria-hidden="true" />
                {formatDose(record.sleepHours)}h
              </span>
            )}
            {record.bedtime && <span>Bed {record.bedtime}</span>}
            {!moods.length &&
              record.energy === null &&
              record.stress === null &&
              record.sleepHours === null &&
              !record.bedtime && (
                <span>
                  {record.words
                    ? "Journal writing saved"
                    : "Check-in details saved"}
                </span>
              )}
          </div>
        </div>
      </article>
    );
  }
  if (record.kind === "goal")
    return (
      <article
        className={styles.card + " " + styles.simple}
        data-notification-record="goal"
      >
        {record.medication ? (
          <MedicationCardIconStack
            color={record.medication.color}
            icon={record.medication.icon}
            iconRotation={record.medication.iconRotation}
            quantity={1}
          />
        ) : (
          <span className={styles.symbol}>
            <Target aria-hidden="true" />
          </span>
        )}
        <div className={styles.copy}>
          <div className={styles.heading}>
            <strong className={styles.name}>
              {record.medication?.name ?? "Medication goal"}
            </strong>
            <strong className={styles.goalAmount}>
              {formatDose(record.dailyLimitMg)} <small>mg/day</small>
            </strong>
          </div>
          <p className={styles.meta}>
            <CalendarDays size={13} aria-hidden="true" />
            {record.startsOn}
            {record.endsOn ? " → " + record.endsOn : " · Open-ended"}
          </p>
        </div>
      </article>
    );
  return (
    <article
      className={styles.card + " " + styles.simple}
      data-notification-record="timezone"
    >
      <span className={styles.symbol}>
        <Clock3 aria-hidden="true" />
      </span>
      <div className={styles.copy}>
        <strong className={styles.name}>{record.timeZone}</strong>
        <p className={styles.meta}>Journal Timezone · 06:00 day boundary</p>
      </div>
    </article>
  );
}
