"use client";

import { sortMedicationsByUsage } from "@/lib/medication-usage";
import {
  normalizeJournalMentionText,
  parseJournalMentionHref,
} from "@/lib/journal-mentions";
import mentionStyles from "./medication-mention-filter.module.css";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Leaf, Pill, X } from "lucide-react";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { toast } from "@/components/ui/journal-toast";
import { useJournal } from "@/components/journal-provider";
import {
  DraftStatus,
  StackViewStorageStatus,
  useJournalWorkspace,
  usePersistentDraft,
} from "@/components/journal-drafts";
import { ResponsiveModal } from "@/components/responsive-modal";
import { PageHeading, PageSurface } from "@/components/page-heading";
import layoutStyles from "./page-layout.module.css";
import {
  countOpioidPills,
  countPills,
  countStimulantPills,
} from "@/lib/pill-counts";
import { MedicationIcon } from "@/components/medication-icon";
import { MedicationLibraryCard } from "@/components/medication-library-card";
import { MedicationActionButton } from "@/components/medication-action-button";
import {
  MedicationClassBadges,
  medicationClassHighlights,
} from "@/components/medication-class-badge";
import { getMedicationClassification } from "@/lib/medication-classification";
import {
  MedicationListHeading,
  MedicationsHeading,
} from "@/components/medications-heading";
import { IntakeForm } from "@/components/intake-form";
import { IntakeAction } from "@/components/intake-action";
import { IntakeCardGroup } from "@/components/intake-card-group";
import { IntakeTimelineEntrance } from "@/components/intake-timeline-entrance";
import { IntakeStackControllerProvider } from "@/components/intake-stack-controller";
import {
  HistoryDayHeading,
  HistoryHeading,
} from "@/components/history-heading";
import { HistoryWeekGroup } from "@/components/history-week-group";
import { groupHistoryWeeks, visibleHistoryWeeks } from "@/lib/history-weeks";
import { EmptyIntakeStack } from "@/components/empty-intake-stack";
import { DailyCheckInSection } from "@/components/daily-check-in";
import { DayTimeMarker } from "@/components/day-time-marker";
import { cn } from "@/lib/utils";
import { GoalForm, MedicationForm } from "@/components/manage-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupIntakes } from "@/lib/intake-groups";
import { canCheckIn, checkInForDay, journalDays } from "@/lib/daily-check-in";
import { Label } from "@/components/ui/label";
import {
  dayIntakes,
  dayKey,
  formatDay,
  formatDose,
  goalForDay,
  isValidDayKey,
  shiftDayKey,
  totalsForDay,
  type AppData,
  type Intake,
  type Medication,
} from "@/lib/domain";

function medicationView(value: unknown): value is { archived: boolean } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "archived" in value &&
    typeof value.archived === "boolean",
  );
}

type HistoryView = { limit: number; expandedWeeks?: string[] };

function historyView(value: unknown): value is HistoryView {
  return Boolean(
    value &&
    typeof value === "object" &&
    "limit" in value &&
    typeof value.limit === "number" &&
    Number.isSafeInteger(value.limit) &&
    value.limit >= 20 &&
    (!("expandedWeeks" in value) ||
      (Array.isArray(value.expandedWeeks) &&
        value.expandedWeeks.length <= 1024 &&
        value.expandedWeeks.every(
          (week: unknown) => typeof week === "string" && isValidDayKey(week),
        ))),
  );
}

function timezoneDraft(value: unknown): value is { timezone: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "timezone" in value &&
    typeof value.timezone === "string" &&
    value.timezone.length <= 128,
  );
}

function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ActionIconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PageSurface className="flex flex-col items-center px-7 py-9 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-foreground/70">
        <ActionIcon name={icon} className="size-7" weight="duotone" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-2 max-w-[270px] text-xs leading-[1.9] text-muted-foreground">
        {children}
      </div>
    </PageSurface>
  );
}

function usagePercent(total: number, maximum: number) {
  return maximum > 0 ? (total / maximum) * 100 : total > 0 ? 100 : 0;
}

function EntryEditor({ intake, close }: { intake: Intake; close: () => void }) {
  const { mutate, busy } = useJournal();
  const { store } = useJournalWorkspace();
  const [confirm, setConfirm] = useState(false);
  const confirmId = useId();
  const deleteLink = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) keepButton.current?.focus();
  }, [confirm]);
  async function remove() {
    try {
      await mutate(`intakes/${intake.id}`, undefined, "DELETE");
      store.clearDraft(`intake:edit:${intake.id}`);
      toast.success("Entry deleted.", { heading: "Intake removed" });
      close();
    } catch {
      /* provider displays error */
    }
  }
  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => !v && close()}
      scrollKey={`intake:edit:${intake.id}`}
      title="Edit Intake"
      titleIcon="pencilSparkles"
      context="Update Entry"
      description="Update this entry. Changes are saved to the day the intake was taken."
    >
      <IntakeForm
        intake={intake}
        onSaved={close}
        footerAction={
          <button
            ref={deleteLink}
            type="button"
            disabled={busy}
            className="min-h-7 shrink-0 rounded-[var(--dialog-radius-compact)] px-1 py-0.5 font-medium text-foreground/65 underline decoration-foreground/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
            aria-expanded={confirm}
            aria-controls={confirmId}
            onClick={() => setConfirm(true)}
            data-edit-intake-delete-link
          >
            Delete intake
          </button>
        }
      />
      {confirm && (
        <div
          id={confirmId}
          className="mt-3"
          role="group"
          aria-label="Confirm intake deletion"
          data-edit-intake-delete-confirmation
        >
          <p className="mb-3 text-center text-xs text-muted-foreground">
            Permanently delete this intake?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              ref={keepButton}
              type="button"
              variant="outline"
              disabled={busy}
              className="h-11"
              onClick={() => {
                setConfirm(false);
                deleteLink.current?.focus({ preventScroll: true });
              }}
            >
              Keep entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              className="h-11"
              onClick={() => void remove()}
            >
              <ActionIcon name="delete" />
              Delete entry
            </Button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  );
}

function IntakeTimeline({
  data,
  day,
  onLog,
}: {
  data: AppData;
  day: string;
  onLog?: () => void;
}) {
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const intakeTarget = useRef<HTMLDivElement>(null);
  const editing =
    dialog?.kind === "intake-edit"
      ? data.intakes.find((entry) => entry.id === dialog.id)
      : undefined;
  useEffect(() => {
    if (dialog?.kind === "intake-edit" && !editing) closeDialog(dialog);
  }, [dialog, editing, closeDialog]);
  useEffect(() => {
    const focusIntakes = () => {
      if (
        window.location.hash === "#logged-intakes" &&
        !document.querySelector(
          '[data-slot="dialog-content"][data-open], [data-slot="drawer-popup"][data-open]',
        )
      )
        intakeTarget.current?.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(focusIntakes);
    window.addEventListener("hashchange", focusIntakes);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", focusIntakes);
    };
  }, [day]);
  const entries = dayIntakes(data, day);
  const groups = groupIntakes(entries);
  return (
    <>
      <div
        id="logged-intakes"
        ref={intakeTarget}
        tabIndex={-1}
        role="region"
        aria-label="Logged intakes"
        className="scroll-mt-6 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        data-logged-intakes
      >
        {!groups.length ? (
          <EmptyIntakeStack onLog={onLog} />
        ) : (
          <IntakeStackControllerProvider key={day} day={day}>
            <div className="intake-timeline">
              {groups.map((group) => (
                <IntakeCardGroup
                  key={group.id}
                  group={group}
                  medications={data.medications}
                  day={day}
                  timeZone={data.settings.timezone}
                  onEdit={(entry) =>
                    openDialog({ kind: "intake-edit", id: entry.id })
                  }
                />
              ))}
            </div>
          </IntakeStackControllerProvider>
        )}
      </div>
      {entries.length > 1 && <StackViewStorageStatus />}
      {editing && (
        <EntryEditor
          intake={editing}
          close={() => closeDialog(dialog ?? undefined)}
        />
      )}
    </>
  );
}

/** Sample check-in availability on each visit; preserve the day's reading order. */
function CheckInTimeline({
  data,
  day,
  now,
  onLog,
  className,
}: {
  data: AppData;
  day: string;
  now: Date;
  onLog?: () => void;
  className?: string;
}) {
  const timeZone = data.settings.timezone;
  const trackingDay = dayKey(now, timeZone);
  const [visit, setVisit] = useState(() => ({
    day,
    timeZone,
    trackingDay,
    at: new Date(),
  }));
  // New route/day/zone scopes resample without remounting an open editor.
  // The shared clock still owns the 06:00 reset and other live time displays.
  if (
    visit.day !== day ||
    visit.timeZone !== timeZone ||
    visit.trackingDay !== trackingDay
  ) {
    setVisit({ day, timeZone, trackingDay, at: now });
  }
  const current = day === trackingDay;
  const eveningReady = canCheckIn(day, visit.at, timeZone);
  const morningReady = canCheckIn(day, visit.at, timeZone, "morning");
  const hasIntakes = dayIntakes(data, day).length > 0;
  const evening = checkInForDay(data.dailyCheckIns, day);
  const morning = checkInForDay(data.dailyCheckIns, day, "morning");
  const eveningCard = (
    <div
      key="check-in-evening"
      hidden={!eveningReady}
      data-check-in-slot={current ? "current" : "past"}
      data-check-in-slot-period="evening"
      data-check-in-position="after"
    >
      <DailyCheckInSection
        day={day}
        checkIn={evening}
        variant={evening ? "saved" : "prompt"}
        intakeSpacing={hasIntakes ? "before" : undefined}
      />
    </div>
  );
  const morningCard = (
    <div
      key="check-in-morning"
      hidden={!morningReady}
      data-check-in-slot={current ? "current" : "past"}
      data-check-in-slot-period="morning"
      data-check-in-position="before"
    >
      <DailyCheckInSection
        day={day}
        period="morning"
        checkIn={morning}
        variant={morning ? "saved" : "prompt"}
        intakeSpacing={hasIntakes ? "after" : undefined}
      />
    </div>
  );
  return (
    <IntakeTimelineEntrance
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-check-in-timeline={current ? "current" : "past"}
    >
      <DayTimeMarker
        key="day-start-marker"
        position="start"
        day={day}
        checkIn={morning}
      />
      {morningCard}
      <section
        key="intakes"
        aria-label={current ? "Today's entries" : "Day's entries"}
        data-daily-intake-list
      >
        <IntakeTimeline data={data} day={day} onLog={onLog} />
      </section>
      {eveningCard}
      <DayTimeMarker
        key="day-end-marker"
        position="end"
        day={day}
        checkIn={evening}
      />
    </IntakeTimelineEntrance>
  );
}

export function TodayPage() {
  const { data, now } = useJournal();
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const open = dialog?.kind === "intake-new";
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const todayEntries = dayIntakes(data, today);
  const pillCounts = countPills(todayEntries, data.medications);
  const openLog = () => openDialog({ kind: "intake-new" });
  return (
    <div className="flex flex-1 flex-col" data-today-layout>
      <h1 className="sr-only">Daily Log</h1>
      <CheckInTimeline
        data={data}
        day={today}
        now={now}
        onLog={openLog}
        className="flex-1"
      />
      <IntakeAction
        onClick={openLog}
        pillCounts={pillCounts}
        opioidCount={countOpioidPills(todayEntries, data.medications)}
        stimulantCount={countStimulantPills(todayEntries, data.medications)}
      />
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && dialog?.kind === "intake-new") closeDialog(dialog);
        }}
        scrollKey="intake:new:today"
        title="Log Intake"
        titleIcon="pencilSparkles"
        context="New Entry"
        description="Record what you took, how much, and when."
      >
        {open && <IntakeForm onSaved={() => closeDialog(dialog)} />}
      </ResponsiveModal>
    </div>
  );
}

export function MedicationsPage() {
  const { data, mutate, busy } = useJournal();
  const search = useSearchParams();
  const medicationReferences = search.getAll("medication");
  const ingredientReferences = search.getAll("ingredient");
  const hasReference =
    medicationReferences.length > 0 || ingredientReferences.length > 0;
  // Only one reference type/value can own the list. Unrelated query context survives Clear.
  const referenceQuery =
    medicationReferences.length === 1 && ingredientReferences.length === 0
      ? new URLSearchParams({ medication: medicationReferences[0] })
      : ingredientReferences.length === 1 && medicationReferences.length === 0
        ? new URLSearchParams({ ingredient: ingredientReferences[0] })
        : null;
  const reference = referenceQuery
    ? parseJournalMentionHref(`/medications?${referenceQuery}`)
    : null;
  const clearQuery = new URLSearchParams(search.toString());
  clearQuery.delete("medication");
  clearQuery.delete("ingredient");
  const clearReferenceHref = `/medications${clearQuery.size ? `?${clearQuery}` : ""}`;
  const referenceKey = hasReference
    ? JSON.stringify([medicationReferences, ingredientReferences])
    : "";
  const referenceVisit = useRef("");
  const {
    dialog,
    openDialog,
    closeDialog,
    ready: workspaceReady,
  } = useJournalWorkspace();
  const view = usePersistentDraft(
    "view:medications",
    () => ({ archived: false }),
    medicationView,
  );
  const showArchived = view.value.archived;
  const medicationDialog =
    dialog?.kind === "medication-new" || dialog?.kind === "medication-edit"
      ? dialog
      : null;
  const editing =
    medicationDialog?.kind === "medication-edit"
      ? data?.medications.find((item) => item.id === medicationDialog.id)
      : undefined;
  const open = Boolean(
    medicationDialog && (medicationDialog.kind === "medication-new" || editing),
  );
  useLayoutEffect(() => {
    if (!referenceKey) {
      referenceVisit.current = "";
      return;
    }
    if (!workspaceReady || referenceVisit.current === referenceKey) return;
    referenceVisit.current = referenceKey;
    // Direct links arrive at the referenced list, never an unrelated restored editor.
    if (medicationDialog) closeDialog(medicationDialog);
  }, [referenceKey, workspaceReady, medicationDialog, closeDialog]);
  useEffect(() => {
    if (data && medicationDialog?.kind === "medication-edit" && !editing)
      closeDialog(medicationDialog);
  }, [data, medicationDialog, editing, closeDialog]);
  if (!data) return null;
  const medications = sortMedicationsByUsage(
    data.medications.filter((item) =>
      hasReference
        ? reference?.kind === "medication"
          ? item.id === reference.id
          : reference?.kind === "ingredient"
            ? normalizeJournalMentionText(item.activeIngredient ?? "") ===
              normalizeJournalMentionText(reference.ingredient)
            : false
        : item.archived === showArchived,
    ),
    data.intakes,
  );
  const referenceAvailable = medications.length > 0;
  const ReferenceIcon = reference?.kind === "ingredient" ? FlaskConical : Pill;
  const referenceTitle =
    reference?.kind === "ingredient"
      ? medications[0]?.activeIngredient?.trim() || reference.ingredient
      : reference?.kind === "medication"
        ? medications[0]?.name || "Medication unavailable"
        : "Reference unavailable";
  async function archive(medication: Medication) {
    try {
      await mutate(
        `medications/${medication.id}`,
        { archived: !medication.archived },
        "PATCH",
      );
      toast.success(
        medication.archived
          ? "Medication restored."
          : "Medication archived. Past entries are saved.",
        { heading: "Medication library" },
      );
      closeDialog(medicationDialog ?? undefined);
    } catch {
      /* Provider displays the error; keep the editor and draft available. */
    }
  }
  return (
    <>
      <MedicationsHeading
        medications={data.medications}
        intakes={data.intakes}
      />
      <MedicationActionButton
        intent="add"
        className="mb-7"
        onClick={() => openDialog({ kind: "medication-new" })}
      />
      {hasReference ? (
        <section
          className={mentionStyles.filter}
          aria-label="Journal reference"
          data-medication-mention-filter
          data-reference-kind={reference?.kind ?? "invalid"}
          data-reference-state={referenceAvailable ? "matched" : "unavailable"}
        >
          <span className={mentionStyles.icon} aria-hidden="true">
            <ReferenceIcon size={18} strokeWidth={2.1} />
          </span>
          <div className={mentionStyles.copy}>
            <p className={mentionStyles.eyebrow}>
              {reference?.kind === "ingredient"
                ? "Active ingredient"
                : "Linked medication"}
            </p>
            <h2 className={mentionStyles.title} title={referenceTitle}>
              {referenceTitle}
            </h2>
            <p className={mentionStyles.detail} role="status">
              {referenceAvailable
                ? `${medications.length} ${medications.length === 1 ? "medication" : "medications"}${medications.some((item) => item.archived) ? " · Includes archived" : " · In your kit"}`
                : reference?.kind === "ingredient"
                  ? "No medication currently uses this ingredient. Your journal link stays intact."
                  : "This reference no longer matches your kit. Your journal link stays intact."}
            </p>
          </div>
          <Link
            href={clearReferenceHref}
            scroll={false}
            className={mentionStyles.clear}
            aria-label="Clear journal reference and show medication kit"
            data-medication-mention-clear
          >
            <X size={13} strokeWidth={2.2} aria-hidden="true" />
            Show kit
          </Link>
        </section>
      ) : (
        <MedicationListHeading
          archived={showArchived}
          count={medications.length}
          onArchivedChange={(archived) => view.setValue({ archived })}
        />
      )}
      <div
        className="mb-4 flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card/90 px-3 py-2.5"
        data-medication-history-notice
      >
        <ActionIcon name="retry" className="mt-0.5 size-4 text-foreground/70" />
        <p className="text-[11px] leading-[1.7] text-muted-foreground">
          <span className="font-medium text-foreground">
            Edits Update All Past Logs.
          </span>{" "}
          Strength changes recalculate past doses and totals. Logged quantities,
          times and notes stay as entered.
        </p>
      </div>
      <div id="medication-library-list">
        {!medications.length ? (
          hasReference ? (
            <p className={mentionStyles.empty} data-medication-mention-empty>
              Choose Show kit to return to your saved medication list.
            </p>
          ) : (
            <EmptyState
              icon="medications"
              title={
                showArchived
                  ? "Nothing Archived."
                  : "Start with Your Medication."
              }
            >
              {showArchived
                ? "Archived medications stay here, and their past entries stay in your journal."
                : "Add the exact name and strength from the packaging. Your first log starts here."}
            </EmptyState>
          )
        ) : (
          <div className="space-y-3">
            {medications.map((medication) => (
              <MedicationLibraryCard
                key={medication.id}
                medication={medication}
                disabled={busy}
                onEdit={() =>
                  openDialog({ kind: "medication-edit", id: medication.id })
                }
              />
            ))}
          </div>
        )}
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && medicationDialog) closeDialog(medicationDialog);
        }}
        scrollKey={editing ? `med:edit:${editing.id}` : "med:new"}
        title={editing ? "Edit Medication" : "Add Medication"}
        titleIcon="medications"
        headerVariant="medication"
        context={editing ? "Update Details" : "The Essentials"}
        description="Medication details and appearance."
      >
        {open && (
          <>
            <MedicationForm
              key={editing?.id ?? "new"}
              medication={editing}
              onSaved={() => closeDialog(medicationDialog ?? undefined)}
            />
            {editing && (
              <div
                data-dialog-panel
                className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void archive(editing)}
                  className="h-11 w-full gap-2 text-xs text-muted-foreground"
                  data-medication-archive-action
                >
                  <ActionIcon
                    name={editing.archived ? "restore" : "archive"}
                    className="size-4"
                  />
                  {editing.archived
                    ? "Restore Medication"
                    : "Archive Medication"}
                </Button>
              </div>
            )}
          </>
        )}
      </ResponsiveModal>
    </>
  );
}

export function GoalsPage() {
  const { data, now, mutate, busy } = useJournal();
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const open = dialog?.kind === "goal-new";
  const [deleting, setDeleting] = useState<string | null>(null);
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const totals = totalsForDay(data, today);
  const goals = [...data.goals].sort(
    (a, b) =>
      b.startsOn.localeCompare(a.startsOn) ||
      b.createdAt.localeCompare(a.createdAt),
  );
  async function remove() {
    if (!deleting) return;
    try {
      await mutate(`goals/${deleting}`, undefined, "DELETE");
      setDeleting(null);
      toast.success("Goal removed.", { heading: "Daily goal" });
    } catch {
      /* provider displays error */
    }
  }
  return (
    <>
      <PageHeading
        title="Goals"
        context="Daily maximums"
        icon={<ActionIcon name="goals" />}
      >
        Keep track of the targets agreed with your prescriber.
      </PageHeading>
      <Button
        className="mb-7 h-13 w-full gap-2 rounded-2xl"
        onClick={() => openDialog({ kind: "goal-new" })}
      >
        <ActionIcon name="goals" />
        Set a daily goal
      </Button>
      {!goals.length ? (
        <EmptyState icon="goals" title="A Little Direction, When You’re Ready.">
          Add a daily maximum for one medication. Your journal will help you
          keep sight of it.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const med = data.medications.find(
              (m) => m.id === goal.medicationId,
            );
            const current =
              goalForDay(data, goal.medicationId, today)?.id === goal.id;
            const taken =
              totals.find((t) => t.medicationId === goal.medicationId)
                ?.totalMg ?? 0;
            const future = goal.startsOn > today;
            return (
              <article
                key={goal.id}
                className={`${layoutStyles.surface} p-5 ${medicationClassHighlights(med)}`}
                data-benzodiazepine={
                  med?.isBenzodiazepine === true || undefined
                }
                data-opioid={med?.isOpioid === true || undefined}
                data-medication-classification={getMedicationClassification(
                  med,
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <MedicationIcon
                    color={med?.color}
                    icon={med?.icon}
                    rotation={med?.iconRotation}
                    isBenzodiazepine={med?.isBenzodiazepine === true}
                    isOpioid={med?.isOpioid === true}
                    small
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <h2 className="min-w-0 truncate text-sm font-medium">
                        {med?.name ?? "Medication"}
                      </h2>
                      <MedicationClassBadges medication={med} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {current
                        ? "Current daily maximum"
                        : future
                          ? "Upcoming goal"
                          : "Previous goal"}
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${med?.name ?? "medication"} goal`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                    onClick={() => setDeleting(goal.id)}
                  >
                    <ActionIcon name="delete" />
                  </button>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                    {formatDose(goal.dailyLimitMg)}
                    <span className="ml-1.5 font-sans text-xs tracking-normal text-muted-foreground">
                      mg / day
                    </span>
                  </p>
                  <span className="rounded-full bg-primary/7 px-2.5 py-1 text-[9px] text-foreground">
                    {current ? "Active" : future ? "Upcoming" : "Past"}
                  </span>
                </div>
                {current && (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatDose(taken)} mg logged today</span>
                      <span>
                        {goal.dailyLimitMg === 0
                          ? taken > 0
                            ? "Above maximum"
                            : "No intake recorded"
                          : `${Math.round(usagePercent(taken, goal.dailyLimitMg))}%`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-primary/65"
                        style={{
                          width: `${Math.min(usagePercent(taken, goal.dailyLimitMg), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-4 border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
                  From{" "}
                  {formatDay(goal.startsOn, {
                    weekday: undefined,
                    month: "short",
                    year: "numeric",
                  })}
                  {goal.endsOn
                    ? ` until ${formatDay(goal.endsOn, { weekday: undefined, month: "short", year: "numeric" })}`
                    : " · ongoing"}
                </p>
                {goal.note && (
                  <p className="mt-2 text-[11px] leading-relaxed break-words text-muted-foreground">
                    {goal.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="canvas-copy mt-7 flex gap-3 p-1">
        <Leaf size={17} className="mt-1 shrink-0" />
        <p className="text-[11px] leading-[1.9] text-canvas-muted-foreground">
          This is a record of your own goals, not a taper plan. Always work with
          your prescriber on dose changes. New goals can start on a future date.
        </p>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && dialog?.kind === "goal-new") closeDialog(dialog);
        }}
        scrollKey="goal:new"
        title="Set a Goal"
        context="Daily Maximum"
        description="Record a daily maximum you have chosen with your prescriber. This does not calculate a taper schedule."
      >
        {open && <GoalForm onSaved={() => closeDialog(dialog ?? undefined)} />}
      </ResponsiveModal>
      <ResponsiveModal
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        scrollKey={deleting ? `goal:remove:${deleting}` : "goal:remove"}
        title="Remove This Goal?"
        context="Confirm Removal"
        description="This also removes it from historical summaries. Your intake entries stay in your journal."
      >
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => setDeleting(null)}
          >
            Keep goal
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            className="h-12 rounded-xl"
            onClick={() => void remove()}
          >
            <ActionIcon name="delete" />
            Remove goal
          </Button>
        </div>
      </ResponsiveModal>
    </>
  );
}

function JournalPreferencesForm({ onSaved }: { onSaved: () => void }) {
  const { data, mutate, busy } = useJournal();
  const draft = usePersistentDraft(
    "preferences",
    () => ({ timezone: data!.settings.timezone }),
    timezoneDraft,
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await mutate("settings", { timezone: draft.value.timezone }, "PATCH");
          draft.clearDraft();
          toast.success("Timezone updated.", { heading: "Journal settings" });
          onSaved();
        } catch {
          /* The provider displays the error; the draft stays available. */
        }
      }}
    >
      <div className="form-field">
        <Label htmlFor="timezone">Journal Timezone</Label>
        <Input
          id="timezone"
          value={draft.value.timezone}
          onChange={(event) => draft.setValue({ timezone: event.target.value })}
          disabled={busy}
          maxLength={128}
          list="timezones"
          required
          className="h-10 rounded-xl px-3 text-base md:text-sm"
        />
        <datalist id="timezones">
          {[
            "Europe/Vienna",
            "Europe/London",
            "Europe/Berlin",
            "America/New_York",
            "America/Los_Angeles",
            "Asia/Tokyo",
            "Australia/Sydney",
            "UTC",
          ].map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Use an IANA timezone such as Europe/Vienna. Daylight-saving changes
          are handled automatically.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2" data-draft-action-footer>
        <DialogPrimaryButton
          className="w-full"
          type="submit"
          disabled={busy}
          pending={busy}
        >
          {busy ? "Saving preferences…" : "Save preferences"}
        </DialogPrimaryButton>
        <DraftStatus
          hasDraft={draft.hasDraft}
          status={draft.status}
          restored={draft.restored}
          onReset={
            busy
              ? undefined
              : () => draft.resetDraft({ timezone: data!.settings.timezone })
          }
        />
      </div>
    </form>
  );
}

function JournalPreferences() {
  const { signOut, busy } = useJournal();
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const open = dialog?.kind === "preferences";
  const [saving, setSaving] = useState(false);
  async function logout() {
    setSaving(true);
    try {
      await signOut();
    } catch {
      toast.error("Unable to sign out. Please try again.", {
        heading: "Sign-out unsuccessful",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="canvas-copy mt-8 flex items-center justify-center gap-4">
        <a
          href="/api/export"
          download
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <ActionIcon name="export" className="size-4" />
          Export journal
        </a>
        <span className="h-3 w-px bg-border" />
        <button
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => openDialog({ kind: "preferences" })}
        >
          <ActionIcon name="settings" className="size-4" />
          Preferences
        </button>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && dialog?.kind === "preferences") closeDialog(dialog);
        }}
        scrollKey="preferences"
        title="Preferences"
        context="Your Journal"
        description="Your day begins at 06:00 in this timezone. Changing it regroups all of your entries."
      >
        {open && <JournalPreferencesForm onSaved={() => closeDialog(dialog)} />}
        <div className="mt-5 border-t pt-4">
          <Button
            variant="ghost"
            disabled={saving || busy}
            className="h-11 w-full gap-2 text-xs text-muted-foreground"
            onClick={() => void logout()}
          >
            <ActionIcon name="signOut" />
            Sign out
          </Button>
        </div>
      </ResponsiveModal>
    </>
  );
}

export function HistoryPage() {
  const { data, now } = useJournal();
  const history = usePersistentDraft<HistoryView>(
    "view:history",
    () => ({ limit: 20 }),
    historyView,
  );
  const limit = history.value.limit;
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const days = journalDays(
    data.intakes,
    data.dailyCheckIns,
    data.settings.timezone,
  ).filter((day) => day < today);
  const weeks = groupHistoryWeeks(days);
  const visibleWeeks = visibleHistoryWeeks(weeks, limit);
  return (
    <>
      <HistoryHeading
        days={days}
        logCount={data.intakes.reduce(
          (total, entry) =>
            total +
            (dayKey(entry.takenAt, data.settings.timezone) < today ? 1 : 0),
          0,
        )}
        timezone={data.settings.timezone}
      />
      {!days.length ? (
        <EmptyState icon="history" title="Your Story Starts Here.">
          Past days will appear here as you keep logging. Each new day begins at
          06:00.
        </EmptyState>
      ) : (
        <div
          className="space-y-5 [container-type:inline-size]"
          data-history-list
        >
          {visibleWeeks.map((week) => (
            <HistoryWeekGroup
              key={week.id}
              data={data}
              week={week}
              expanded={history.value.expandedWeeks?.includes(week.id) ?? false}
              onExpandedChange={(expanded) =>
                history.setValue((previous) => ({
                  ...previous,
                  expandedWeeks: expanded
                    ? [
                        ...(previous.expandedWeeks ?? []).filter(
                          (id) => id !== week.id,
                        ),
                        week.id,
                      ].slice(-1024)
                    : (previous.expandedWeeks ?? []).filter(
                        (id) => id !== week.id,
                      ),
                }))
              }
            />
          ))}
        </div>
      )}
      {weeks.length > visibleWeeks.length && (
        <Button
          variant="outline"
          onClick={() =>
            history.setValue((previous) => ({
              ...previous,
              limit: previous.limit + 20,
            }))
          }
          className="mt-5 h-12 w-full gap-2 rounded-2xl text-xs"
        >
          <ActionIcon name="loadMore" />
          Load more weeks
          <span className="text-muted-foreground">
            ({weeks.length - visibleWeeks.length} left)
          </span>
        </Button>
      )}
      <JournalPreferences />
    </>
  );
}

export function DayPage({ day }: { day: string }) {
  const { data, now } = useJournal();
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const open = dialog?.kind === "intake-new" && dialog.day === day;
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const isFuture = day > today;
  const entries = dayIntakes(data, day);
  const medicationCount = new Set(entries.map((entry) => entry.medicationId))
    .size;
  return (
    <>
      <HistoryDayHeading
        day={day}
        intakeCount={entries.length}
        medicationCount={medicationCount}
      />
      <div className="mb-6">
        <CheckInTimeline
          data={data}
          day={day}
          now={now}
          onLog={
            isFuture ? undefined : () => openDialog({ kind: "intake-new", day })
          }
        />
      </div>
      <div className="canvas-copy flex items-center justify-between gap-3 border-t pt-4">
        <Link
          href={`/history/${shiftDayKey(day, -1)}`}
          className="flex min-h-11 items-center gap-1 text-[10px] text-muted-foreground"
        >
          <ActionIcon name="back" className="size-4" />
          Previous day
        </Link>
        {!isFuture && (
          <Button
            variant="ghost"
            className="h-11 gap-1 text-[10px] text-foreground"
            onClick={() => openDialog({ kind: "intake-new", day })}
          >
            <ActionIcon name="create" className="size-4.5" />
            Add missed intake
          </Button>
        )}
        {day < today && (
          <Link
            href={`/history/${shiftDayKey(day, 1)}`}
            className="flex min-h-11 items-center gap-1 text-[10px] text-muted-foreground"
          >
            Next day
            <ActionIcon name="next" className="size-4" />
          </Link>
        )}
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && open) closeDialog(dialog ?? undefined);
        }}
        scrollKey={`intake:new:${day}`}
        title="Log Intake"
        titleIcon="pencilSparkles"
        context="Past Entry"
        description="Add an intake you missed. Check the date and time before saving."
      >
        {open && (
          <IntakeForm
            initialDay={day}
            onSaved={() => closeDialog(dialog ?? undefined)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
