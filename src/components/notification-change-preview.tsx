"use client";

import type { ReactNode } from "react";
import {
  BedDouble,
  BookOpen,
  CalendarDays,
  Clock3,
  Coffee,
  MoonStar,
  Target,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MedicationCard } from "@/components/medication-card";
import { MedicationCardIcon } from "@/components/medication-card-icon";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { DAILY_MOODS } from "@/lib/daily-check-in";
import { INTAKE_ROUTES } from "@/lib/intake-routes";
import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import type {
  NotificationChangePreview as ChangePreview,
  NotificationPreviewRecord,
} from "@/lib/notification-change-preview";
import styles from "./notification-change-preview.module.css";

/** Actual card presentation, backed only by confirmed immutable display data. */
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
        <section
          className={styles.snapshot}
          aria-label={compared ? "Before change" : "Removed"}
          data-notification-snapshot="before"
        >
          <SnapshotCaption
            label={compared ? "Before" : "Removed"}
            record={preview.before}
          />
          <RecordPreview record={preview.before} />
        </section>
      )}
      {preview.after && (
        <section
          className={styles.snapshot}
          aria-label={compared ? "After change" : "Saved"}
          data-notification-snapshot="after"
        >
          <SnapshotCaption
            label={compared ? "After" : "Saved"}
            record={preview.after}
          />
          <RecordPreview record={preview.after} />
        </section>
      )}
    </div>
  );
}

function SnapshotCaption({
  label,
  record,
}: {
  label: string;
  record: NotificationPreviewRecord;
}) {
  let context: ReactNode = null;
  let title: string | undefined;
  if (record.kind === "intake") {
    const localDay = toLocalInput(record.takenAt, record.timeZone).slice(0, 10);
    const date = formatDay(localDay, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const route = INTAKE_ROUTES.find((item) => item.value === record.route);
    title = [date, route?.label].filter(Boolean).join(" · ");
    context = <span>{title}</span>;
  } else if (record.kind === "medication") {
    context = record.medication.archived ? "Archived" : "Active";
  } else if (record.kind === "check-in") {
    context = (
      <time dateTime={record.day}>
        {formatDay(record.day, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </time>
    );
  }
  return (
    <div className={styles.caption}>
      <span className={styles.stage}>{label}</span>
      {context && (
        <span className={styles.context} title={title}>
          {context}
        </span>
      )}
    </div>
  );
}

function MedicationPreview({
  record,
}: {
  record: Extract<NotificationPreviewRecord, { kind: "intake" | "medication" }>;
}) {
  const intake = record.kind === "intake";
  const medication = record.medication;
  const quantity = intake ? record.quantity : record.medication.defaultQuantity;
  const strength = intake ? record.strengthMg : record.medication.strengthMg;
  const form = intake ? record.form : record.medication.form;
  const name = intake ? record.name : record.medication.name;
  const time = intake
    ? toLocalInput(record.takenAt, record.timeZone).slice(11)
    : null;

  return (
    <MedicationCard
      readOnly
      medication={medication}
      name={name}
      form={form}
      ingredient={medication?.activeIngredient}
      quantity={quantity}
      formPresentation={intake ? "icon" : "text"}
      className={styles.medication}
      data-notification-record={record.kind}
      data-notification-snapshot-card
      data-intake-card={intake ? "" : undefined}
      data-medication-library-card={intake ? undefined : ""}
      data-medication-archived={
        !intake && record.medication.archived ? true : undefined
      }
      leading={
        intake ? (
          <time
            className="intake-card-time"
            dateTime={record.takenAt}
            title={time + " · " + record.timeZone}
            data-intake-time
          >
            {time}
          </time>
        ) : (
          <span className="intake-card-time medication-library-default">
            Default
          </span>
        )
      }
      trailing={
        <MedicationCardDose
          quantity={quantity}
          strengthMg={strength}
          form={form}
          source={intake ? "recorded" : "default"}
        />
      }
    />
  );
}

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className={styles.metric} role="img" title={label} aria-label={label}>
      <Icon aria-hidden="true" />
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

function Panel({
  kind,
  artwork,
  children,
}: {
  kind: "check-in" | "goal" | "timezone";
  artwork: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={styles.panel} data-notification-record={kind}>
      {artwork}
      <div className={styles.copy}>{children}</div>
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
      <Panel
        kind="check-in"
        artwork={
          <span className={styles.symbol} aria-hidden="true">
            <Icon />
          </span>
        }
      >
        <div className={styles.heading}>
          <strong className={styles.name}>
            {record.period === "morning" ? "Morning" : "Evening"} Check-In
          </strong>
          <span className={styles.moods}>
            {moods.map((mood) => (
              <span
                key={mood.value}
                role="img"
                aria-label={mood.label}
                title={mood.label}
              >
                {mood.emoji}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.metrics}>
          <Metric icon={BookOpen} label={record.words + " words"}>
            {record.words} words
          </Metric>
          {record.energy !== null && (
            <Metric
              icon={Zap}
              label={
                "Energy " + record.energy + " out of " + record.energyScale
              }
            >
              {record.energy}/{record.energyScale}
            </Metric>
          )}
          {record.stress !== null && (
            <Metric
              icon={Waves}
              label={
                "Stress " + record.stress + " out of " + record.stressScale
              }
            >
              {record.stress}/{record.stressScale}
            </Metric>
          )}
          {record.sleepHours !== null && (
            <Metric
              icon={BedDouble}
              label={formatDose(record.sleepHours) + " hours of sleep"}
            >
              {formatDose(record.sleepHours)}h
            </Metric>
          )}
          {record.bedtime && (
            <Metric icon={MoonStar} label={"Bedtime " + record.bedtime}>
              {record.bedtime}
            </Metric>
          )}
        </div>
      </Panel>
    );
  }
  if (record.kind === "goal")
    return (
      <Panel
        kind="goal"
        artwork={
          record.medication ? (
            <MedicationCardIcon
              color={record.medication.color}
              icon={record.medication.icon}
              iconRotation={record.medication.iconRotation}
              className={styles.goalIcon}
            />
          ) : (
            <span className={styles.symbol} aria-hidden="true">
              <Target />
            </span>
          )
        }
      >
        <div className={styles.heading}>
          <strong className={styles.name}>
            {record.medication?.name ?? "Medication Goal"}
          </strong>
          <strong className={styles.goalAmount}>
            {formatDose(record.dailyLimitMg)}
            <small>mg/day</small>
          </strong>
        </div>
        <div className={styles.range}>
          <CalendarDays aria-hidden="true" />
          <time dateTime={record.startsOn}>
            {formatDay(record.startsOn, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <span aria-hidden="true">→</span>
          {record.endsOn ? (
            <time dateTime={record.endsOn}>
              {formatDay(record.endsOn, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          ) : (
            <span>Open-ended</span>
          )}
        </div>
      </Panel>
    );
  return (
    <Panel
      kind="timezone"
      artwork={
        <span className={styles.symbol} aria-hidden="true">
          <Clock3 />
        </span>
      }
    >
      <span className={styles.detailLabel}>Journal Timezone</span>
      <strong className={styles.timezone}>{record.timeZone}</strong>
    </Panel>
  );
}
