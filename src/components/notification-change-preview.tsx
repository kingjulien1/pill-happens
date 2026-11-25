"use client";

import { useId, useMemo, type ReactNode } from "react";
import {
  BedDouble,
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
  Info,
  PencilLine,
  Undo2,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MedicationCardIcon } from "@/components/medication-card-icon";
import { DailyMoodIndicators } from "@/components/daily-mood-icon";
import { DAILY_MOOD_VALUES } from "@/lib/daily-check-in";
import { formatDay, formatDose } from "@/lib/domain";
import type {
  NotificationChangePreview as ChangePreview,
  NotificationPreviewRecord,
} from "@/lib/notification-change-preview";
import { recordNotificationContent } from "@/lib/record-notification-content";
import { MedicationPreview } from "./notification-medication-preview";
import { NotificationIntakeReceipt } from "./notification-intake-receipt";
export { MedicationPreview } from "./notification-medication-preview";
import styles from "./notification-change-preview.module.css";

/** Actual card presentation, backed only by confirmed immutable display data. */
export function NotificationChangePreview({
  preview,
  canUndo = false,
  paragraphs,
}: {
  preview: ChangePreview;
  canUndo?: boolean;
  paragraphs?: ReactNode[];
}) {
  if (!preview.before && !preview.after) return null;
  if (
    preview.after?.kind === "intake" &&
    (!preview.before || preview.before.kind === "intake")
  )
    return (
      <NotificationIntakeReceipt
        before={preview.before}
        after={preview.after}
        medicationChanged={preview.medicationChanged}
      />
    );
  return (
    <RecordReceiptPreview
      preview={preview}
      canUndo={canUndo}
      paragraphs={paragraphs}
    />
  );
}

function RecordReceiptPreview({
  preview,
  canUndo,
  paragraphs,
}: {
  preview: ChangePreview;
  canUndo: boolean;
  paragraphs?: ReactNode[];
}) {
  const content = useMemo(() => recordNotificationContent(preview), [preview]);
  const id = useId();
  if (!content)
    return (
      <section className={`${styles.root} ${styles.receipt}`}>
        <header className={styles.receiptIntro}>
          <div className={styles.receiptHeading}>
            <div>
              <h3>Saved details</h3>
            </div>
          </div>
          <p>Open your journal to review the current saved details.</p>
        </header>
      </section>
    );
  const record = preview.after ?? preview.before!;
  const extraContext =
    paragraphs
      ?.slice(1)
      .filter(
        (paragraph) =>
          !(typeof paragraph === "string" && /^Undo\b/i.test(paragraph)),
      ) ?? [];
  const Icon =
    content.operation === "removed"
      ? Trash2
      : content.operation === "updated"
        ? PencilLine
        : BadgeCheck;
  return (
    <div
      className={`${styles.root} ${styles.receipt} ${styles.recordReceipt}`}
      data-notification-change-preview
      data-record-receipt={record.kind}
    >
      <header className={styles.receiptIntro}>
        <div className={styles.receiptHeading}>
          <div>
            <span className={styles.receiptKicker}>
              <Icon aria-hidden="true" />
              {content.category} · {content.operation}
            </span>
            <h3>{content.title}</h3>
          </div>
        </div>
        <div className={styles.receiptContext}>
          <strong>{content.primary}</strong>
          <span className={styles.contextSlash} aria-hidden="true">
            /
          </span>
          <span>{content.secondary}</span>
        </div>
        <p>{paragraphs?.[0] ?? content.message}</p>
      </header>
      <section
        className={styles.receiptStage}
        aria-label={
          content.operation === "removed" ? "Removed record" : "Saved record"
        }
        data-notification-snapshot={preview.after ? "after" : "before"}
      >
        <RecordPreview record={record} />
      </section>
      {content.changes.length > 0 && (
        <section
          className={styles.changeRecap}
          aria-labelledby={`${id}-changes`}
          data-record-change-recap
        >
          <header className={styles.recapHeading}>
            <h4 id={`${id}-changes`}>
              <History aria-hidden="true" />
              The changed pieces
            </h4>
            <span>Previous → Saved</span>
          </header>
          <dl className={styles.changeStories}>
            {content.changes.map((change) => (
              <div
                key={change.label}
                className={styles.changeStory}
                data-wide={
                  Math.max(change.before.length, change.after.length) > 35 ||
                  undefined
                }
              >
                <dt>{change.label}</dt>
                <dd className={styles.storyPrevious} title={change.before}>
                  <span>Was</span>
                  <span className={styles.changeValue}>{change.before}</span>
                </dd>
                <dd className={styles.storyCurrent} title={change.after}>
                  <ArrowRight aria-hidden="true" />
                  <span className="sr-only">Saved as </span>
                  <span className={styles.changeValue}>{change.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <aside className={styles.correctionNote} role="note">
        <Info aria-hidden="true" />
        <div>
          <h4>Keep in mind</h4>
          <p>{content.guidance}</p>
          {extraContext.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </aside>
      <p className={styles.receiptUndo}>
        <Undo2 aria-hidden="true" />
        <span>
          {canUndo ? (
            <>
              <strong>Undo</strong>{" "}
              {content.operation === "removed"
                ? "restores this removed record."
                : content.operation === "saved"
                  ? "reverses this addition."
                  : "restores the previous saved values."}
            </>
          ) : (
            "Undo isn’t available for this notice."
          )}
        </span>
      </p>
      <p className={styles.receiptFootnote}>
        Snapshot of this change · Related pages show your current journal.
      </p>
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
    const moods = DAILY_MOOD_VALUES.filter((mood) =>
      record.moods.includes(mood),
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
          <DailyMoodIndicators moods={moods} className={styles.moods} />
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
