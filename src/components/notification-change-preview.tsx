"use client";

import { useId, useMemo, type MouseEvent, type ReactNode } from "react";
import {
  BedDouble,
  ArrowRightLeft,
  ArrowRight,
  ArrowUpRight,
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
  Info,
  NotebookPen,
  PencilLine,
  PillBottle,
  Undo2,
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
import {
  intakeReceiptDestinations,
  intakeReceiptMeta,
  type IntakeReceiptDestinations,
} from "@/lib/intake-receipt";
import styles from "./notification-change-preview.module.css";

/** Actual card presentation, backed only by confirmed immutable display data. */
export function NotificationChangePreview({
  preview,
  intakeLinks,
  onFollowLink,
  canUndo = false,
}: {
  preview: ChangePreview;
  intakeLinks?: IntakeReceiptDestinations;
  onFollowLink?: (event: MouseEvent<HTMLAnchorElement>) => void;
  canUndo?: boolean;
}) {
  if (!preview.before && !preview.after) return null;
  if (
    preview.after?.kind === "intake" &&
    (!preview.before || preview.before.kind === "intake")
  )
    return (
      <IntakeReceiptPreview
        before={preview.before}
        after={preview.after}
        medicationChanged={preview.medicationChanged}
        destinations={intakeLinks}
        onFollowLink={onFollowLink}
        canUndo={canUndo}
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

function IntakeReceiptPreview({
  before,
  after,
  medicationChanged,
  destinations = intakeReceiptDestinations(),
  onFollowLink,
  canUndo,
}: {
  before?: IntakeSnapshot;
  after: IntakeSnapshot;
  medicationChanged?: boolean;
  destinations?: IntakeReceiptDestinations;
  onFollowLink?: (event: MouseEvent<HTMLAnchorElement>) => void;
  canUndo: boolean;
}) {
  const id = useId();
  const meta = useMemo(() => intakeReceiptMeta(after), [after]);
  const update = useMemo(
    () =>
      before
        ? intakeUpdatePreview(before, after, medicationChanged)
        : undefined,
    [before, after, medicationChanged],
  );
  const count = update?.switched ? 1 : (update?.rows.length ?? 0);
  const mark = (field: IntakeUpdateField | "total", content: ReactNode) => {
    const row = update?.rows.find((item) => item.field === field);
    const change = field === "total" ? update?.total : row;
    if (!update || update.switched || !change) return content;
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
  const EntryIcon =
    destinations.entry.kind === "entry" ? NotebookPen : CalendarDays;
  const KickerIcon = before ? PencilLine : BadgeCheck;
  return (
    <div
      className={`${styles.root} ${styles.receipt}`}
      data-notification-change-preview
      data-intake-receipt={before ? "updated" : "created"}
      data-notification-intake-update={before ? "" : undefined}
    >
      <header className={styles.receiptIntro}>
        <div className={styles.receiptHeading}>
          <div>
            <span className={styles.receiptKicker}>
              <KickerIcon aria-hidden="true" />
              {before ? "Updated intake" : "Saved intake"}
            </span>
            <h3>
              {before ? "Your edit, in place." : "Logged & accounted for."}
            </h3>
          </div>
          <span className={styles.receiptCount}>
            <strong>{before ? count : 1}</strong>
            <span>
              {before
                ? update?.switched
                  ? "switch"
                  : count === 1
                    ? "change"
                    : "changes"
                : "entry"}
            </span>
          </span>
        </div>
        <div
          className={styles.receiptContext}
          data-intake-receipt-context
          title={`Taken in ${after.timeZone}`}
        >
          <strong>{meta.weekday}</strong>
          <span className={styles.contextSlash} aria-hidden="true">
            /
          </span>
          <time dateTime={after.takenAt}>{meta.date}</time>
          <span aria-hidden="true">·</span>
          <time dateTime={after.takenAt}>
            <Clock3 aria-hidden="true" />
            {meta.clock}
          </time>
        </div>
        <p>
          {!before
            ? "Saved with the amount, route and time shown below. Open the entry if any detail needs correcting."
            : update?.switched
              ? "The medication has changed on this intake. This is the saved version of the same entry."
              : count
                ? "This is the saved version. Rose marks point to edited values; the recap below keeps their previous values in view."
                : "The entry was saved again with the same recorded values. You can still open it to make a correction."}
        </p>
      </header>

      <section
        className={styles.receiptStage}
        aria-label={before ? "Updated intake" : "Saved intake"}
        data-notification-snapshot="after"
      >
        <MedicationPreview record={after} mark={mark} />
        <dl className={styles.receiptFacts}>
          <div>
            <dt>
              <Route aria-hidden="true" />
              Taken via
            </dt>
            <dd>{meta.route}</dd>
          </div>
          <div>
            <dt>
              <Pill aria-hidden="true" />
              Medication type
            </dt>
            <dd>{meta.form}</dd>
          </div>
        </dl>
        <p className={styles.trackingHint}>
          <CalendarDays aria-hidden="true" />
          <span>
            {meta.previousCalendarDay ? (
              <>
                Before 06:00 · Filed under <strong>{meta.trackingDate}</strong>
              </>
            ) : (
              <>
                Tracking days begin at <strong>06:00</strong>
              </>
            )}
          </span>
        </p>
      </section>

      {before && update?.switched ? (
        <aside
          className={`${styles.medicationSwitch} ${styles.receiptSwitch}`}
          role="note"
          aria-labelledby={`${id}-switch`}
          data-medication-switch
        >
          <span className={styles.switchGlyph}>
            <ArrowRightLeft aria-hidden="true" />
          </span>
          <h4 id={`${id}-switch`}>Medication changed. Still one intake.</h4>
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
        </aside>
      ) : update && update.rows.length > 0 ? (
        <section
          className={styles.changeRecap}
          aria-labelledby={`${id}-changes`}
          data-intake-update-history
        >
          <header className={styles.recapHeading}>
            <h4 id={`${id}-changes`}>
              <History aria-hidden="true" />
              The changed pieces
            </h4>
            <span>Previous → Saved</span>
          </header>
          <dl className={styles.changeStories}>
            {update.rows.map((row) => {
              const Icon = changeIcons[row.field];
              return (
                <div
                  key={row.field}
                  id={`${id}-${row.field}`}
                  className={styles.changeStory}
                  data-intake-history-field={row.field}
                  data-change-field={row.field}
                >
                  <dt>
                    <Icon aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className={styles.storyPrevious}>
                    <span>Was</span>
                    {row.before}
                  </dd>
                  <dd className={styles.storyCurrent}>
                    <ArrowRight aria-hidden="true" />
                    <span className="sr-only">Saved as </span>
                    {row.after}
                  </dd>
                </div>
              );
            })}
          </dl>
          {update.total && (
            <div className={styles.receiptTotal} id={`${id}-total`}>
              <span>
                <strong>Total dose</strong>
                <small>Quantity × strength</small>
              </span>
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
        </section>
      ) : null}

      <section className={styles.receiptNext} aria-labelledby={`${id}-next`}>
        <header className={styles.recapHeading}>
          <h4 id={`${id}-next`}>Need a second look?</h4>
          <span>Your next steps</span>
        </header>
        <div className={styles.receiptDestinations}>
          <a
            className={styles.receiptDestination}
            data-receipt-destination="entry"
            href={destinations.entry.href}
            aria-label={`${destinations.entry.kind === "entry" ? "Open this intake" : destinations.entry.kind === "day" ? "Open this day" : "Open daily log"} · ${destinations.entry.label}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onFollowLink}
          >
            <span className={styles.destinationTitle}>
              <EntryIcon aria-hidden="true" />
              <strong>
                {destinations.entry.kind === "entry"
                  ? "Open this intake"
                  : destinations.entry.kind === "day"
                    ? "Open this day"
                    : "Open daily log"}
              </strong>
              <ArrowUpRight aria-hidden="true" />
            </span>
            <span>
              {destinations.entry.kind === "entry"
                ? "Jump to the highlighted entry to review or edit it."
                : "Find this intake, then open it to make a correction."}
            </span>
          </a>
          <a
            className={styles.receiptDestination}
            data-receipt-destination="medication"
            href={destinations.medication.href}
            aria-label={`Medication page · ${destinations.medication.label}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onFollowLink}
          >
            <span className={styles.destinationTitle}>
              <PillBottle aria-hidden="true" />
              <strong>Medication page</strong>
              <ArrowUpRight aria-hidden="true" />
            </span>
            <span>
              Review the strength, type and saved defaults for your medication.
            </span>
          </a>
        </div>
      </section>

      <aside className={styles.correctionNote} role="note">
        <Info aria-hidden="true" />
        <div>
          <h4>One intake or the whole medication?</h4>
          <p>
            Edit the entry for a quantity, route or time correction. Changing a
            medication’s strength also recalculates its earlier logged doses and
            totals.
          </p>
        </div>
      </aside>
      <p className={styles.receiptUndo}>
        <Undo2 aria-hidden="true" />
        <span>
          {canUndo ? (
            <>
              The <strong>Undo</strong> button below{" "}
              {before
                ? "restores the previous saved values for this intake."
                : "removes only this newly saved intake."}
            </>
          ) : (
            "Undo isn’t available here. You can still correct the entry from its day."
          )}
        </span>
      </p>
      <p className={styles.receiptFootnote}>
        This is a snapshot of this save. Open the entry for its latest details.
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
