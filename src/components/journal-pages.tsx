"use client";

import { sortMedicationsByUsage } from "@/lib/medication-usage";
import {
  normalizeJournalMentionText,
  parseJournalMentionHref,
} from "@/lib/journal-mentions";
import mentionStyles from "./medication-mention-filter.module.css";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, FlaskConical, Leaf, Pill, X } from "lucide-react";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import dialogButtonStyles from "./dialog-primary-button.module.css";
import { sameDraftRevision } from "@/lib/journal-drafts";
import { toast } from "@/components/ui/journal-toast";
import {
  goalNotificationSnapshot,
  intakeNotificationSnapshot,
  medicationNotificationSnapshot,
} from "@/lib/notification-change-preview";
import { useJournal } from "@/components/journal-provider";
import {
  DraftStatus,
  StackViewStorageStatus,
  useJournalWorkspace,
  usePersistentDraft,
} from "@/components/journal-drafts";
import {
  CONFIRMATION_PAUSE_MS,
  DELETE_EXIT_MS,
} from "./use-dialog-sweep-frame";
import { IntakeDeletionExit } from "./intake-deletion-exit";
import deletionStyles from "./intake-deletion-exit.module.css";
import { ResponsiveModal } from "@/components/responsive-modal";
import { PageEmptyState, PageHeading } from "@/components/page-heading";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import goalStyles from "./goals-page.module.css";
import {
  countOpioidPills,
  countPills,
  countStimulantPills,
} from "@/lib/pill-counts";
import { MedicationIcon } from "@/components/medication-icon";
import { MedicationLibraryCard } from "@/components/medication-library-card";
import { MedicationActionButton } from "@/components/medication-action-button";
import { MedicationDialogActions } from "@/components/medication-dialog-actions";
import {
  MedicationClassBadges,
  medicationClassHighlights,
} from "@/components/medication-class-badge";
import { getMedicationClassification } from "@/lib/medication-classification";
import {
  MedicationListHeading,
  type RotationFilter,
  MedicationsHeading,
} from "@/components/medications-heading";
import { IntakeAction } from "@/components/intake-action";
import { IntakeCardGroup } from "@/components/intake-card-group";
import { IntakeTimelineEntrance } from "@/components/intake-timeline-entrance";
import { IntakeStackControllerProvider } from "@/components/intake-stack-controller";
import {
  HistoryDayHeading,
  HistoryHeading,
} from "@/components/history-heading";
import historyStyles from "./history-heading.module.css";
import { HistoryWeekGroup } from "@/components/history-week-group";
import { groupHistoryWeeks, visibleHistoryWeeks } from "@/lib/history-weeks";
import { EmptyIntakeStack } from "@/components/empty-intake-stack";
import { DailyCheckInSection } from "@/components/daily-check-in";
import { PageTopFade, TodayTopFade } from "@/components/today-top-fade";
import { PageActionDock } from "@/components/page-action-dock";
import { DayTimeMarker } from "@/components/day-time-marker";
import { cn } from "@/lib/utils";
import type {
  MedicationDraftAvailability,
  MedicationFormControls,
} from "@/components/manage-forms";
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

type HistoryView = { limit: number; expandedWeeks?: string[] };

// Form/catalog/editor code is loaded only when its dialog is opened.
const IntakeForm = dynamic(() =>
  import("@/components/intake-form").then((module) => module.IntakeForm),
);
const MedicationForm = dynamic(() =>
  import("@/components/manage-forms").then((module) => module.MedicationForm),
);
const GoalForm = dynamic(() =>
  import("@/components/manage-forms").then((module) => module.GoalForm),
);

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
    <PageEmptyState
      icon={<ActionIcon name={icon} weight="duotone" />}
      title={title}
    >
      {children}
    </PageEmptyState>
  );
}

function usagePercent(total: number, maximum: number) {
  return maximum > 0 ? (total / maximum) * 100 : total > 0 ? 100 : 0;
}

function EntryEditor({ entry, close }: { entry?: Intake; close: () => void }) {
  const { data, mutate } = useJournal();
  const { store } = useJournalWorkspace();
  // A successful mutation immediately removes the source row from the timeline.
  // Retain only this editor's entry while its review closes and its sheet exits.
  const [deletion, setDeletion] = useState<{
    intake: Intake;
    data: AppData;
    phase: "pending" | "returning" | "settling" | "shredding";
  } | null>(null);
  const intake = deletion?.intake ?? entry;
  const mounted = useRef(false);
  const receipt = useRef<(() => void) | null>(null);
  const publish = useCallback(() => {
    const notify = receipt.current;
    receipt.current = null;
    notify?.();
  }, []);
  useEffect(() => {
    mounted.current = true;
    window.addEventListener("pagehide", publish);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", publish);
      publish();
    };
  }, [publish]);
  const afterReview = useCallback(() => {
    setDeletion((current) =>
      current?.phase === "returning"
        ? { ...current, phase: "settling" }
        : current,
    );
  }, []);
  useEffect(() => {
    if (deletion?.phase === "returning") {
      // A layout change can replace the review drawer during its native exit.
      const timer = setTimeout(afterReview, 950);
      return () => clearTimeout(timer);
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (deletion?.phase === "settling") {
      const timer = setTimeout(
        () => {
          setDeletion((current) =>
            current?.phase === "settling"
              ? { ...current, phase: "shredding" }
              : current,
          );
        },
        reduced ? 0 : CONFIRMATION_PAUSE_MS,
      );
      return () => clearTimeout(timer);
    }
    if (deletion?.phase !== "shredding") return;
    const timer = setTimeout(
      () => {
        close();
        publish();
      },
      reduced ? 175 : DELETE_EXIT_MS,
    );
    return () => clearTimeout(timer);
  }, [deletion?.phase, afterReview, close, publish]);
  useEffect(() => {
    if (intake) return;
    // A medication replacement can publish its new ID one frame after removing the old one.
    const frame = requestAnimationFrame(close);
    return () => cancelAnimationFrame(frame);
  }, [intake, close]);

  async function remove() {
    if (!intake || !data || deletion)
      throw new Error("This entry is no longer available to delete.");
    setDeletion({ intake, data, phase: "pending" });
    const beforePreview = intakeNotificationSnapshot(
      intake,
      data.medications.find((item) => item.id === intake.medicationId),
      data.settings.timezone,
    );
    let saved;
    try {
      saved = await mutate(`intakes/${intake.id}`, undefined, "DELETE", false);
    } catch (error) {
      if (mounted.current) setDeletion(null);
      throw error;
    }
    receipt.current = () => {
      store.clearDraft(`intake:edit:${intake.id}`);
      toast.success("Entry removed from your daily log.", {
        journalScope: saved.notificationScope,
        ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
        heading: "Intake removed",
        details: {
          preview: { before: beforePreview },
          paragraphs: [
            "This intake has been removed. Its medication’s daily total and goal progress now reflect the remaining entries; the medication itself stays in your library.",
            "Undo restores this exact entry with its original quantity, time taken and notes.",
          ],
          facts: [
            { label: "Medication", value: intake.medicationName },
            {
              label: "Amount Removed",
              value: `${formatDose(intake.quantity)} × ${formatDose(intake.strengthMg)} mg`,
            },
          ],
          links: [{ label: "Daily Log", href: "/" }],
          footer: "Your other entries and medication settings are unchanged.",
        },
        ...(saved.undo
          ? {
              undo: {
                label: "Restore Entry",
                onUndo: saved.undo,
                receipt: saved.receipt,
              },
            }
          : {}),
      });
    };
    if (mounted.current) setDeletion({ intake, data, phase: "returning" });
    else publish();
  }
  if (!intake) return null;
  return (
    <ResponsiveModal
      open
      interactionLocked={Boolean(deletion)}
      surfaceClassName={
        deletion?.phase === "shredding" ? deletionStyles.shredding : undefined
      }
      returnFocus={
        deletion
          ? () => document.querySelector<HTMLElement>("[data-logged-intakes]")
          : undefined
      }
      onOpenChange={(v) => !v && close()}
      scrollKey={`intake:edit:${intake.id}`}
      title="Edit Intake"
      headerVariant="intake"
      showFooterNavigation={false}
      context={
        <JournalDialogSubheading
          title={intake.medicationName}
          detail={
            <time dateTime={intake.takenAt}>
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: data?.settings.timezone,
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }).format(new Date(intake.takenAt))}
            </time>
          }
        />
      }
      description="Adjust the medication, route or amount to match what you took. The date and time determine which tracking day this entry belongs to."
    >
      <IntakeForm
        intake={intake}
        deletionSnapshot={deletion?.data}
        onSaved={close}
        onDelete={{ remove, afterReview }}
      />
      {deletion?.phase === "shredding" && <IntakeDeletionExit />}
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
  const closeEditor = useCallback(() => {
    if (dialog?.kind === "intake-edit") closeDialog(dialog);
  }, [dialog, closeDialog]);
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
      {dialog?.kind === "intake-edit" && (
        <EntryEditor key={dialog.id} entry={editing} close={closeEditor} />
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
        intakeSpacing="after"
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

function LogIntakeDialog({
  day,
  historical = false,
  open,
  onClose,
}: {
  day: string;
  historical?: boolean;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      scrollKey={`intake:new:${historical ? day : "today"}`}
      title={<span className="block truncate pe-2">Jot That Dose</span>}
      headerVariant="intake"
      showFooterNavigation={false}
      context={
        <JournalDialogSubheading
          title={
            <time dateTime={day}>
              {formatDay(day, {
                weekday: "long",
                month: undefined,
                day: undefined,
              })}
            </time>
          }
          detail={formatDay(day, { weekday: undefined, month: "long" })}
        />
      }
      description={
        historical
          ? "Choose the medication, route and amount for the intake you missed. Enter the time you took it so it appears on the correct tracking day."
          : "Choose your medication and how you took it, then enter the amount. If you’re logging later, adjust the date and time to match when you took it."
      }
    >
      {open && (
        <IntakeForm
          initialDay={historical ? day : undefined}
          onSaved={onClose}
        />
      )}
    </ResponsiveModal>
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
      <TodayTopFade />
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
      <LogIntakeDialog
        open={open}
        day={today}
        onClose={() => {
          if (dialog?.kind === "intake-new") closeDialog(dialog);
        }}
      />
    </div>
  );
}

export function MedicationsPage() {
  const { data, derived, mutate, busy, notificationScope } = useJournal();
  const search = useSearchParams();
  const [rotationFilter, setRotationFilter] = useState<RotationFilter>(null);
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
  const historyNoticeShown = useRef(false);
  const {
    dialog,
    openDialog,
    closeDialog,
    ready: workspaceReady,
  } = useJournalWorkspace();
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
  const formControls = useRef<MedicationFormControls>(null);
  const medicationOpener = useRef<HTMLElement | null>(null);
  const [formDraft, setFormDraft] =
    useState<MedicationDraftAvailability | null>(null);
  const formDraftKey = editing ? `med:edit:${editing.id}` : "med:new";
  const canResetDraft =
    formDraft?.draftKey === formDraftKey && formDraft.hasDraft;
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
  useEffect(() => {
    if (!data || historyNoticeShown.current) return;
    historyNoticeShown.current = true;
    const linkedMedications = new Set(
      data.intakes.map((entry) => entry.medicationId),
    ).size;
    toast.info(
      "Strength edits recalculate doses · Logged details stay as entered",
      {
        id: "medication-history-policy",
        journalScope: notificationScope,
        heading: "Medication edits update history.",
        duration: 18_000,
        details: {
          paragraphs: [
            "Medication edits stay in sync across your journal, including entries you recorded before the change.",
          ],
          facts: [
            { label: "Entries", value: String(data.intakes.length) },
            { label: "Library", value: String(data.medications.length) },
            {
              label: "Dose totals",
              value: `${linkedMedications} logged medication${linkedMedications === 1 ? "" : "s"}`,
            },
          ],
          links: [{ label: "Medication Library", href: "/medications" }],
          footer:
            "Names, strengths and appearance stay consistent wherever that medication appears.",
        },
      },
    );
  }, [data, notificationScope]);
  if (!data) return null;
  const rankedMedications = sortMedicationsByUsage(
    data.medications.filter((item) =>
      hasReference
        ? reference?.kind === "medication"
          ? item.id === reference.id
          : reference?.kind === "ingredient"
            ? normalizeJournalMentionText(item.activeIngredient ?? "") ===
              normalizeJournalMentionText(reference.ingredient)
            : false
        : true,
    ),
    data.intakes,
    derived?.medicationUsage,
  );
  const medications = hasReference
    ? rankedMedications
    : [
        ...rankedMedications.filter((item) => !item.archived),
        ...rankedMedications.filter((item) => item.archived),
      ];
  const visibleMedications = !hasReference && rotationFilter
    ? medications.filter((item) => item.archived === (rotationFilter === "bench"))
    : medications;
  const referenceAvailable = medications.length > 0;
  const ReferenceIcon = reference?.kind === "ingredient" ? FlaskConical : Pill;
  const referenceTitle =
    reference?.kind === "ingredient"
      ? medications[0]?.activeIngredient?.trim() || reference.ingredient
      : reference?.kind === "medication"
        ? medications[0]?.name || "Medication unavailable"
        : "Reference unavailable";
  async function changeRotation(medication: Medication): Promise<boolean> {
    if (busy) return false;
    const beforePreview = {
      kind: "medication" as const,
      medication: medicationNotificationSnapshot(medication),
    };
    try {
      const saved = await mutate(
        `medications/${medication.id}`,
        { archived: !medication.archived },
        "PATCH",
      );
      const updatedMedication = saved.data.medications.find(
        (item) => item.id === medication.id,
      );
      toast.success(
        medication.archived
          ? `${medication.name} is back in rotation.`
          : `${medication.name} is on the bench.`,
        {
          journalScope: saved.notificationScope,
          ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
          heading: medication.archived
            ? "Back in rotation."
            : "Medication benched.",
          details: {
            ...(updatedMedication
              ? {
                  preview: {
                    before: beforePreview,
                    after: {
                      kind: "medication" as const,
                      medication:
                        medicationNotificationSnapshot(updatedMedication),
                    },
                  },
                }
              : {}),
            paragraphs: [
              medication.archived
                ? "This medication is available for new intakes with its saved defaults."
                : "This medication is on the bench. Past intakes and totals stay in your journal.",
            ],
            facts: [
              { label: "Medication", value: medication.name },
              {
                label: "Rotation",
                value: medication.archived ? "In rotation" : "Benched",
              },
            ],
            links: [{ label: "Medication Library", href: "/medications" }],
            footer: "Undo returns this medication to its previous status.",
          },
          ...(saved.undo
            ? {
                undo: {
                  label: "Undo Status Change",
                  onUndo: saved.undo,
                  receipt: saved.receipt,
                },
              }
            : {}),
        },
      );
      if (medicationDialog?.kind === "medication-edit" && medicationDialog.id === medication.id) {
        closeDialog(medicationDialog);
      } else if (!hasReference && rotationFilter) {
        document.querySelector<HTMLButtonElement>(`[data-rotation-filter="${rotationFilter}"]`)?.focus();
      }
      return true;
    } catch {
      /* Provider displays the error; keep the editor and draft available. */
      return false;
    }
  }
  return (
    <div data-medications-page>
      <PageTopFade targetSelector="[data-medications-page] [data-page-heading-title]" />
      <MedicationsHeading
        medications={data.medications}
        intakes={data.intakes}
        dialogOpen={open}
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
                ? `${medications.length} ${medications.length === 1 ? "medication" : "medications"}${medications.some((item) => item.archived) ? " · Includes benched medication" : " · In your kit"}`
                : reference?.kind === "ingredient"
                  ? "No medication currently uses this ingredient. Your journal link stays intact."
                  : "This reference no longer matches your kit. Your journal link stays intact."}
            </p>
          </div>
          <Button
            navigation
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={clearReferenceHref} scroll={false} />}
            className={`${mentionStyles.clear} h-auto p-0`}
            aria-label="Clear journal reference and show medication kit"
            data-medication-mention-clear
          >
            <X size={13} strokeWidth={2.2} aria-hidden="true" />
            Show kit
          </Button>
        </section>
      ) : (
        <MedicationListHeading
          count={medications.length}
          filter={rotationFilter}
          onFilter={setRotationFilter}
          activeCount={data.medications.filter((item) => !item.archived).length}
          archivedCount={
            data.medications.filter((item) => item.archived).length
          }
        />
      )}
      <div id="medication-library-list">
        {!medications.length ? (
          hasReference ? (
            <p className={mentionStyles.empty} data-medication-mention-empty>
              Choose Show kit to return to your saved medication list.
            </p>
          ) : (
            <EmptyState icon="medications" title="Start with Your Medication.">
              Add the exact name and strength from the packaging. Your first log
              starts here.
            </EmptyState>
          )
        ) : !visibleMedications.length ? (
          <p className={mentionStyles.empty} role="status">
            {rotationFilter === "bench" ? "The bench is empty. All your medications are in rotation." : "Your medications are on the bench. Choose one to return it to rotation."}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleMedications.map((medication, index) => (
              <Fragment key={medication.id}>
                {!hasReference && !rotationFilter &&
                  medication.archived &&
                  !medications[index - 1]?.archived && (
                    <div
                      className="flex items-center gap-3 pt-3 text-muted-foreground"
                      data-medications-bench-heading
                    >
                      <h3 className="shrink-0 text-[11px] font-medium">
                        On the bench
                      </h3>
                      <span
                        className="h-px flex-1 bg-border/60"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                <MedicationLibraryCard
                  medication={medication}
                  disabled={busy}
                  onChangeRotation={() => changeRotation(medication)}
                  onEdit={() => {
                    medicationOpener.current =
                      document.querySelector<HTMLElement>(
                        `[data-medication-library-card="${CSS.escape(medication.id)}"]`,
                      );
                    openDialog({ kind: "medication-edit", id: medication.id });
                  }}
                />
              </Fragment>
            ))}
          </div>
        )}
      </div>
      <PageActionDock label="Medication actions">
        <div className="intake-action-content pointer-events-auto">
          <div className="intake-action-shell">
            <MedicationActionButton
              intent="add"
              onClick={(event) => {
                medicationOpener.current = event.currentTarget;
                openDialog({ kind: "medication-new" });
              }}
            />
          </div>
          <p className="intake-action-note" data-medication-action-note>
            Your medications, your defaults, your way.
          </p>
        </div>
      </PageActionDock>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next && medicationDialog) closeDialog(medicationDialog);
        }}
        scrollKey={editing ? `med:edit:${editing.id}` : "med:new"}
        returnFocus={() => {
          const opener = medicationOpener.current;
          // Status changes can reorder a card; keep a stable keyboard target.
          return opener?.isConnected &&
            !opener.matches(":disabled, [aria-disabled='true']")
            ? opener
            : document.querySelector<HTMLElement>(
                "[data-medication-add-action]",
              );
        }}
        title={editing ? "Edit Medication" : "Add Medication"}
        headerVariant="medication"
        headerActions={
          <MedicationDialogActions
            key={formDraftKey}
            medicationName={editing?.name ?? "New Medication"}
            resetDisabled={busy || !canResetDraft}
            archiveDisabled={busy}
            archived={editing?.archived}
            onReset={() =>
              formControls.current?.draftKey === formDraftKey
                ? formControls.current.resetDraft()
                : false
            }
            onArchive={editing ? () => changeRotation(editing) : undefined}
          />
        }
        description={
          editing
            ? "Update details, then review the look. Changes also update linked past doses; recorded quantities and times stay as entered."
            : "Set the name, strength and usual amount. An ingredient is optional; preview your symbol and color below."
        }
      >
        {open && (
          <MedicationForm
            key={editing?.id ?? "new"}
            medication={editing}
            controlsRef={formControls}
            onDraftAvailabilityChange={setFormDraft}
            onSaved={() => closeDialog(medicationDialog ?? undefined)}
          />
        )}
      </ResponsiveModal>
    </div>
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
      const removed = goals.find((goal) => goal.id === deleting);
      const beforePreview = removed
        ? goalNotificationSnapshot(
            removed,
            data?.medications.find((item) => item.id === removed.medicationId),
          )
        : undefined;
      const saved = await mutate(`goals/${deleting}`, undefined, "DELETE");
      setDeleting(null);
      toast.success("Goal removed. Your entries stay saved.", {
        journalScope: saved.notificationScope,
        ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
        heading: "Goal removed",
        details: {
          ...(beforePreview ? { preview: { before: beforePreview } } : {}),
          paragraphs: [
            "This goal has been removed from your saved maximums. Intake records are unchanged; daily goal progress now follows the remaining effective goal, if one applies.",
          ],
          ...(removed
            ? {
                facts: [
                  {
                    label: "Removed Maximum",
                    value: `${formatDose(removed.dailyLimitMg)} mg`,
                  },
                  { label: "Started", value: removed.startsOn },
                ],
              }
            : {}),
          links: [{ label: "Review Goals", href: "/goals" }],
          footer:
            "Undo restores the removed goal with its original date range.",
        },
        ...(saved.undo
          ? {
              undo: {
                label: "Restore Goal",
                onUndo: saved.undo,
                receipt: saved.receipt,
              },
            }
          : {}),
      });
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
      <DialogPrimaryButton
        type="button"
        className="mb-7 w-full"
        leadingIcon={<ActionIcon name="goals" />}
        trailingIcon={<ActionIcon name="next" />}
        onClick={() => openDialog({ kind: "goal-new" })}
      >
        Set a Daily Goal
      </DialogPrimaryButton>
      {!goals.length ? (
        <EmptyState icon="goals" title="A Little Direction, When You’re Ready.">
          Add a daily maximum for one medication. Your journal will help you
          keep sight of it.
        </EmptyState>
      ) : (
        <div className={goalStyles.list}>
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
                className={`${goalStyles.card} ${medicationClassHighlights(med)}`}
                data-benzodiazepine={
                  med?.isBenzodiazepine === true || undefined
                }
                data-opioid={med?.isOpioid === true || undefined}
                data-medication-classification={getMedicationClassification(
                  med,
                )}
              >
                <div className={goalStyles.header}>
                  <MedicationIcon
                    color={med?.color}
                    icon={med?.icon}
                    rotation={med?.iconRotation}
                    isBenzodiazepine={med?.isBenzodiazepine === true}
                    isOpioid={med?.isOpioid === true}
                    small
                  />
                  <div className={goalStyles.identity}>
                    <div className={goalStyles.name}>
                      <h2>
                        {med ? (
                          <Link
                            className={goalStyles.medicationLink}
                            href={`/medications/${encodeURIComponent(med.id)}`}
                          >
                            <span>{med.name}</span>
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </Link>
                        ) : (
                          "Medication"
                        )}
                      </h2>
                      <MedicationClassBadges medication={med} />
                    </div>
                    <p className={goalStyles.context}>
                      {current
                        ? "Current daily maximum"
                        : future
                          ? "Upcoming goal"
                          : "Previous goal"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={`Remove ${med?.name ?? "medication"} goal`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                    onClick={() => setDeleting(goal.id)}
                  >
                    <ActionIcon name="delete" />
                  </Button>
                </div>
                <div className={goalStyles.amountRow}>
                  <p className={goalStyles.amount}>
                    {formatDose(goal.dailyLimitMg)}
                    <span>mg / day</span>
                  </p>
                  <span
                    className={goalStyles.status}
                    data-current={current || undefined}
                  >
                    {current ? "Active" : future ? "Upcoming" : "Past"}
                  </span>
                </div>
                {current && (
                  <div className={goalStyles.progress}>
                    <div className={goalStyles.progressLabel}>
                      <span>
                        <strong>{formatDose(taken)} mg</strong> logged today
                      </span>
                      <span>
                        {goal.dailyLimitMg === 0
                          ? taken > 0
                            ? "Above maximum"
                            : "No intake recorded"
                          : `${Math.round(usagePercent(taken, goal.dailyLimitMg))}%`}
                      </span>
                    </div>
                    <div
                      className={goalStyles.track}
                      role="progressbar"
                      aria-label={`${med?.name ?? "Medication"} daily maximum`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(
                        Math.round(usagePercent(taken, goal.dailyLimitMg)),
                        100,
                      )}
                      aria-valuetext={`${formatDose(taken)} mg recorded; daily maximum ${formatDose(goal.dailyLimitMg)} mg`}
                    >
                      <div
                        style={{
                          width: `${Math.min(usagePercent(taken, goal.dailyLimitMg), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <dl className={goalStyles.dates}>
                  <div>
                    <dt>Starts</dt>
                    <dd>
                      <time dateTime={goal.startsOn}>
                        {formatDay(goal.startsOn, {
                          weekday: undefined,
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>Ends</dt>
                    <dd>
                      {goal.endsOn ? (
                        <time dateTime={goal.endsOn}>
                          {formatDay(goal.endsOn, {
                            weekday: undefined,
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      ) : (
                        "Ongoing"
                      )}
                    </dd>
                  </div>
                </dl>
                {goal.note && <p className={goalStyles.note}>{goal.note}</p>}
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
        showFooterNavigation={false}
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
  const saving = useRef(false);
  const { store } = useJournalWorkspace();
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
        if (busy || saving.current) return;
        saving.current = true;
        const submitted = store.getSnapshot().drafts.preferences;
        const beforePreview = data
          ? { kind: "timezone" as const, timeZone: data.settings.timezone }
          : undefined;
        try {
          const saved = await mutate(
            "settings",
            { timezone: draft.value.timezone },
            "PATCH",
          );
          store.synchronize();
          if (
            sameDraftRevision(submitted, store.getSnapshot().drafts.preferences)
          ) {
            draft.clearDraft();
          }
          toast.success("Timezone updated for your journal.", {
            journalScope: saved.notificationScope,
            ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
            heading: "Journal timezone updated.",
            details: {
              preview: {
                ...(beforePreview ? { before: beforePreview } : {}),
                after: {
                  kind: "timezone",
                  timeZone: saved.data.settings.timezone,
                },
              },
              paragraphs: [
                "Saved instants stay unchanged. This timezone now controls displayed times and the local 06:00 tracking-day boundary, so some entries may appear on a different day.",
              ],
              facts: [
                { label: "Journal Timezone", value: draft.value.timezone },
              ],
              links: [
                { label: "Daily Log", href: "/" },
                { label: "Past Days", href: "/history" },
              ],
              footer: "Undo restores the timezone used before this change.",
            },
            ...(saved.undo
              ? {
                  undo: {
                    label: "Undo Timezone",
                    onUndo: saved.undo,
                    receipt: saved.receipt,
                  },
                }
              : {}),
          });
          onSaved();
        } catch {
          /* The provider displays the error; the draft stays available. */
        } finally {
          saving.current = false;
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
          className="h-11 rounded-xl px-3 text-base md:text-sm"
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
        <p className="text-xs leading-relaxed text-muted-foreground">
          Use an IANA timezone such as Europe/Vienna. Daylight-saving changes
          are handled automatically.
        </p>
      </div>

      <div className={dialogButtonStyles.formFooter} data-draft-action-footer>
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
  const { signOut, busy, notificationScope } = useJournal();
  const { dialog, openDialog, closeDialog } = useJournalWorkspace();
  const open = dialog?.kind === "preferences";
  const [saving, setSaving] = useState(false);
  async function logout() {
    setSaving(true);
    try {
      await signOut();
    } catch {
      toast.error("Check your connection, then try again from Preferences.", {
        journalScope: notificationScope,
        heading: "Sign-out not confirmed.",
        details: {
          paragraphs: [
            "The app could not confirm that sign-out finished. Keep this page open and try signing out again when your connection is available.",
          ],
        },
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="canvas-copy mt-8 flex items-center justify-center gap-4">
        <Button
          navigation
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href="/api/export" download />}
          className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground h-auto p-0"
        >
          <ActionIcon name="export" className="size-4" />
          Export journal
        </Button>
        <span className="h-3 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-0 font-medium"
          onClick={() => openDialog({ kind: "preferences" })}
        >
          <ActionIcon name="settings" className="size-4" />
          Preferences
        </Button>
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
      <nav
        className={historyStyles.dayNavigation}
        aria-label="Daily log navigation"
      >
        <Button
          navigation
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/history/${shiftDayKey(day, -1)}`} />}
          className={`${historyStyles.dayPrevious} h-auto`}
        >
          <ActionIcon name="back" className="size-4" />
          Previous day
        </Button>
        {!isFuture && (
          <Button
            variant="ghost"
            className={historyStyles.dayAdd}
            onClick={() => openDialog({ kind: "intake-new", day })}
          >
            <ActionIcon name="create" className="size-4.5" />
            Add missed intake
          </Button>
        )}
        {day < today && (
          <Button
            navigation
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/history/${shiftDayKey(day, 1)}`} />}
            className={`${historyStyles.dayNext} h-auto`}
          >
            Next day
            <ActionIcon name="next" className="size-4" />
          </Button>
        )}
      </nav>
      <LogIntakeDialog
        open={open}
        day={day}
        historical
        onClose={() => {
          if (open) closeDialog(dialog ?? undefined);
        }}
      />
    </>
  );
}
