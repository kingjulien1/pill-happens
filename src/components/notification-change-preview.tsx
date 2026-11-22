"use client";

import { useId, useMemo, type ReactNode } from "react";
import {
  BedDouble,
  ArrowRightLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Clock3,
  Coffee,
  History,
  MoonStar,
  Target,
  Trash2,
  Pill,
  Route,
  Scale,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MedicationCard } from "@/components/medication-card";
import { MedicationCardIcon } from "@/components/medication-card-icon";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { DailyMoodIcon } from "@/components/daily-mood-icon";
import { DAILY_MOODS } from "@/lib/daily-check-in";
import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import { getMedicationType } from "@/lib/medication-types";
import type {
  NotificationChangePreview as ChangePreview,
  NotificationPreviewRecord,
} from "@/lib/notification-change-preview";
import { notificationChangeSummary } from "@/lib/notification-change-preview";
import {
  intakeUpdatePreview,
  type IntakeSnapshot,
  type IntakeUpdateField,
} from "@/lib/intake-update-preview";
import styles from "./notification-change-preview.module.css";

/** Actual card presentation, backed only by confirmed immutable display data. */
export function NotificationChangePreview({
  preview,
}: {
  preview: ChangePreview;
}) {
  if (!preview.before && !preview.after) return null;
  if (preview.before?.kind === "intake" && preview.after?.kind === "intake")
    return (
      <IntakeUpdatePreview
        before={preview.before}
        after={preview.after}
        medicationChanged={preview.medicationChanged}
      />
    );
  const compared = Boolean(preview.before && preview.after);
  const SummaryIcon = compared
    ? ArrowRightLeft
    : preview.before
      ? Trash2
      : BadgeCheck;
  return (
    <div className={styles.root} data-notification-change-preview>
      <p className={styles.summary} data-notification-change-summary>
        <SummaryIcon aria-hidden="true" />
        <span>{notificationChangeSummary(preview)}</span>
      </p>
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
    });
    title = date;
    context = <time dateTime={localDay}>{date}</time>;
  } else if (record.kind === "medication") {
    context = record.medication.archived ? "Archived" : "Active";
  } else if (record.kind === "check-in") {
    context = (
      <time dateTime={record.day}>
        {formatDay(record.day, {
          month: "short",
          day: "numeric",
        })}
      </time>
    );
  }
  const StageIcon =
    label === "Before" ? History : label === "Removed" ? Trash2 : BadgeCheck;
  return (
    <div className={styles.caption}>
      <span className={styles.stage}>
        <StageIcon aria-hidden="true" />
        {label}
      </span>
      {context && (
        <span className={styles.context} title={title}>
          {record.kind !== "medication" && <CalendarDays aria-hidden="true" />}
          {context}
        </span>
      )}
    </div>
  );
}

export function MedicationPreview({
  record,
  mark,
}: {
  record: Extract<NotificationPreviewRecord, { kind: "intake" | "medication" }>;
  mark?: (field: IntakeUpdateField | "total", content: ReactNode) => ReactNode;
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
      intakeRoute={intake ? record.route : undefined}
      formPresentation={intake ? "icon" : "text"}
      className={styles.medication}
      renderDetail={mark}
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
            {mark ? mark("time", time) : time}
          </time>
        ) : undefined
      }
      trailing={
        <MedicationCardDose
          quantity={quantity}
          strengthMg={strength}
          form={form}
          source={intake ? "recorded" : "default"}
          renderValue={mark}
        />
      }
    />
  );
}

const changeIcons = {
  time: Clock3,
  quantity: Scale,
  strength: Pill,
  form: Pill,
  route: Route,
  name: ArrowRightLeft,
};

function IntakeUpdatePreview({
  before,
  after,
  medicationChanged,
}: {
  before: IntakeSnapshot;
  after: IntakeSnapshot;
  medicationChanged?: boolean;
}) {
  const id = useId();
  const update = useMemo(
    () => intakeUpdatePreview(before, after, medicationChanged),
    [before, after, medicationChanged],
  );
  const mark = (field: IntakeUpdateField | "total", content: ReactNode) => {
    const row = update.rows.find((item) => item.field === field);
    const change = field === "total" ? update.total : row;
    if (update.switched || !change) return content;
    return (
      <span
        className={styles.changed}
        data-intake-change={field}
        role="group"
        aria-label={`${row?.label ?? "Total Dose"}: ${change.after}`}
        tabIndex={0}
        aria-describedby={`${id}-${field}`}
      >
        {content}
      </span>
    );
  };
  return (
    <div
      className={styles.root}
      data-notification-change-preview
      data-notification-intake-update
    >
      {update.switched ? (
        <aside
          className={`${styles.historyBubble} ${styles.medicationSwitch}`}
          role="note"
          aria-labelledby={`${id}-title`}
          data-medication-switch
        >
          <h4 id={`${id}-title`}>
            <ArrowRightLeft aria-hidden="true" />
            Medication Changed
          </h4>
          <div className={styles.switchNames}>
            <span>
              <small>Previously</small>
              <strong>{before.name}</strong>
              <small>
                {formatDose(before.strengthMg)} mg ·{" "}
                {before.form
                  ? getMedicationType(before.form).label
                  : "Type not set"}
              </small>
            </span>
            <ArrowRight aria-hidden="true" />
            <span>
              <small>Now</small>
              <strong>{after.name}</strong>
              <small>
                {formatDose(after.strengthMg)} mg ·{" "}
                {after.form
                  ? getMedicationType(after.form).label
                  : "Type not set"}
              </small>
            </span>
          </div>
          <p>Same entry. New medication.</p>
        </aside>
      ) : update.rows.length ? (
        <aside
          className={styles.historyBubble}
          role="note"
          aria-labelledby={`${id}-title`}
          data-intake-update-history
        >
          <header className={styles.historyHeader}>
            <h4 id={`${id}-title`}>
              <History aria-hidden="true" />
              Update History
            </h4>
            <span>
              {update.rows.length}{" "}
              {update.rows.length === 1 ? "change" : "changes"}
            </span>
          </header>
          <div className={styles.historyColumns} aria-hidden="true">
            <span>Just this edit</span>
            <span>Previous → Saved</span>
          </div>
          <dl className={styles.historyRows}>
            {update.rows.map((row) => {
              const Icon = changeIcons[row.field];
              return (
                <div
                  key={row.field}
                  id={`${id}-${row.field}`}
                  data-intake-history-field={row.field}
                >
                  <dt>
                    <Icon aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className={styles.previous}>
                    <span className="sr-only">Previously </span>
                    {row.before}
                  </dd>
                  <ArrowRight aria-hidden="true" />
                  <dd className={styles.current}>
                    <span className="sr-only">Saved as </span>
                    {row.after}
                  </dd>
                </div>
              );
            })}
          </dl>
          {update.total && (
            <div className={styles.historyTotal} id={`${id}-total`}>
              <span>Total Dose</span>
              <span>
                <span className={styles.previous}>
                  <span className="sr-only">Previously </span>
                  {update.total.before}
                </span>
                <ArrowRight aria-hidden="true" />
                <strong>
                  <span className="sr-only">Saved as </span>
                  {update.total.after}
                </strong>
              </span>
            </div>
          )}
        </aside>
      ) : null}
      <section
        className={styles.snapshot}
        aria-label="Updated intake"
        data-notification-snapshot="after"
      >
        <SnapshotCaption label="Updated" record={after} />
        <MedicationPreview record={after} mark={mark} />
      </section>
    </div>
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
                <DailyMoodIcon mood={mood.value} size={14} />
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
            })}
          </time>
          <span aria-hidden="true">→</span>
          {record.endsOn ? (
            <time dateTime={record.endsOn}>
              {formatDay(record.endsOn, {
                month: "short",
                day: "numeric",
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
