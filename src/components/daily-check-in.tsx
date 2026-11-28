"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  BedDouble,
  Clapperboard,
  FlaskConical,
  Moon,
  BookOpen,
  BookOpenCheck,
  PencilLine,
  Sunset,
  Save,
} from "lucide-react";
import { toast } from "@/components/ui/journal-toast";
import { checkInNotificationSnapshot } from "@/lib/notification-change-preview";
import { ActionIcon } from "@/components/action-icon";
import { IntakePrimaryButton } from "@/components/intake-primary-button";
import { DialogErrorPanel } from "./dialog-error-panel";
import { MedicationCardBase } from "@/components/medication-card-base";
import frameStyles from "./card-frame.module.css";
import { CheckInCardBorder as SpecularCardBorder } from "@/components/check-in-card-border";
import { SavedCheckInHeading } from "@/components/saved-check-in-heading";
import {
  CHECK_IN_CARD_COLOR,
  CheckInCardArtwork,
  CheckInCardSurface,
} from "@/components/check-in-card-artwork";
import { recordedSleepAverage } from "@/lib/daily-derived-values";
import { getCheckInCardMetric } from "@/lib/check-in-card-metric";
import { getCheckInCardProgress } from "@/lib/check-in-card-progress";
import { useJournal } from "@/components/journal-provider";
import {
  DraftStatus,
  useJournalWorkspace,
  usePersistentDraft,
  useWorkspaceSnapshot,
} from "@/components/journal-drafts";
import type { WorkspaceSnapshot } from "@/lib/journal-drafts";
import { shallowEqual } from "@/lib/external-store-selector";
import { ResponsiveModal } from "@/components/responsive-modal";
import { DraftResetFooter } from "./draft-reset-footer";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, LibraryBig } from "lucide-react";
import { rememberJournalDestination } from "@/components/journal-drafts";
import { CheckInSection } from "./check-in-section";
import { DailyMoodIndicators } from "./daily-mood-icon";
import { EveningDayRatings } from "@/components/evening-day-ratings";
import { SmallReminders } from "@/components/small-reminders";
import {
  reminderItems,
  remindersCount,
  serializeReminders,
  type ReminderItem,
} from "@/lib/check-in-reminders";
import { useDailyWriting } from "./use-daily-writing";
import {
  dailyJournalForDay,
  dailyJournalDraftKey,
  isDailyWritingDraft,
} from "@/lib/daily-journal";
import { useReflectionSave } from "@/components/use-reflection-save";
import {
  hasMorningSleepContent,
  parseMorningSleepDraft,
} from "@/lib/morning-sleep";
import {
  DAILY_MOODS,
  DAILY_MOOD_CHOICES,
  checkInForDay,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "@/lib/daily-check-in";
import { checkInDatePrefix, checkInHeading } from "@/lib/check-in-headings";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import { formatDay } from "@/lib/domain";
import {
  checkInDefaults,
  checkInDraftKey,
  hasCheckInDraftChanges,
  isCheckInDraft,
  morningSleepForDraft,
  type CheckInDraft,
} from "@/lib/check-in-draft";
import {
  checkInSubmissionDraftUnchanged,
  prepareCheckInSubmission,
} from "@/lib/check-in-submit";
import {
  getCheckInCompletion,
  getCheckInCardFeedback,
  getMorningCheckInCompletion,
} from "@/lib/check-in-completion";
import {
  getCheckInOpenedTime,
  getCheckInUpdatedTime,
} from "@/lib/check-in-logged-time";
import { cn } from "@/lib/utils";
import styles from "./daily-check-in.module.css";

const DailyMoodPicker = dynamic(() =>
  import("@/components/daily-mood-picker").then(
    (module) => module.DailyMoodPicker,
  ),
);
const DailyReflectionEditor = dynamic(() =>
  import("@/components/daily-reflection-editor").then(
    (module) => module.DailyReflectionEditor,
  ),
);
const MorningSleepFields = dynamic(() =>
  import("@/components/morning-sleep-fields").then(
    (module) => module.MorningSleepFields,
  ),
);

type CheckInProps = {
  day: string;
  checkIn?: DailyCheckIn;
  variant: "prompt" | "saved";
  period?: DailyCheckInPeriod;
  intakeSpacing?: "before" | "after";
};

export function DailyCheckInSection({
  day,
  checkIn,
  variant,
  period = "evening",
  intakeSpacing,
}: CheckInProps) {
  const { data, busy, derived } = useJournal();
  const workspace = useJournalWorkspace();
  const morning = period === "morning";
  const title = `${morning ? "Morning" : "Evening"} Check-In`;
  const currentCheckIn = checkInForDay(data?.dailyCheckIns, day, period);
  // The current variant owns the portal, including a restored earlier-day dialog.
  const ownsDialog = variant === (currentCheckIn ? "saved" : "prompt");
  const remembered =
    workspace.dialog?.kind === "check-in" &&
    (workspace.dialog.period ?? "evening") === period
      ? workspace.dialog
      : null;
  const targetDay = remembered?.day ?? day;
  const editing = checkInForDay(data?.dailyCheckIns, targetDay, period);
  const open = ownsDialog && Boolean(remembered);
  const saved = variant === "saved" && Boolean(checkIn);
  const timeZone = data?.settings.timezone ?? "";
  const logged = saved ? getCheckInUpdatedTime(checkIn, timeZone) : null;
  const previewId = useId();
  const journal = useMemo(
    () => dailyJournalForDay(data?.dailyCheckIns, day),
    [data?.dailyCheckIns, day],
  );
  const savedDetails =
    checkIn && journal ? { ...checkIn, note: journal.note } : checkIn;
  const completion = morning
    ? getMorningCheckInCompletion(saved ? savedDetails : undefined)
    : getCheckInCompletion(saved ? savedDetails : undefined);
  const selectCardDraft = useCallback(
    (snapshot: WorkspaceSnapshot) => ({
      draft: snapshot.drafts[checkInDraftKey(day, period)]?.value,
      writing: snapshot.drafts[dailyJournalDraftKey(day)]?.value,
      openedAt: snapshot.checkInOpenedAt[checkInDraftKey(day, period)],
      status: snapshot.status,
    }),
    [day, period],
  );
  const snapshot = useWorkspaceSnapshot(
    workspace.store,
    selectCardDraft,
    shallowEqual,
  );
  const writingDraft = isDailyWritingDraft(snapshot.writing)
    ? snapshot.writing
    : undefined;
  const formDraft = isCheckInDraft(snapshot.draft) ? snapshot.draft : undefined;
  const storedDraft =
    formDraft || writingDraft
      ? {
          ...(formDraft ?? checkInDefaults(currentCheckIn, period)),
          note:
            writingDraft?.note ??
            (formDraft && !formDraft.dailyWriting
              ? formDraft.note
              : (journal?.note ?? "")),
          dailyWriting: undefined,
        }
      : undefined;
  const baseline = currentCheckIn
    ? { ...currentCheckIn, note: journal?.note ?? "" }
    : undefined;
  const hasChanges =
    hasCheckInDraftChanges(formDraft, currentCheckIn, period) ||
    Boolean(writingDraft && writingDraft.note !== (journal?.note ?? ""));
  const progress = getCheckInCardProgress({
    period,
    checkIn: baseline,
    draft: storedDraft,
  });
  const hint = morning ? "Still here. Take stock." : "Survived? Leave notes.";
  const openedAt = snapshot.openedAt;
  const opened = getCheckInOpenedTime(openedAt, timeZone);
  // Dialog visibility and draft progress must never replace the card's artwork.
  const ownDialogOpen = open && targetDay === day;
  const metric = getCheckInCardMetric(
    period,
    currentCheckIn,
    hasChanges && isCheckInDraft(storedDraft) ? storedDraft : undefined,
    morning
      ? (derived?.sleepAverage ?? recordedSleepAverage(data?.dailyCheckIns))
      : undefined,
  );
  const StateIcon = hasChanges ? PencilLine : saved ? BookOpenCheck : BookOpen;
  const eveningMoods = morning
    ? undefined
    : (formDraft?.moods ?? currentCheckIn?.moods);
  const feelingsId = eveningMoods?.length ? `${previewId}-feelings` : undefined;
  const feedback = getCheckInCardFeedback({
    period,
    saved,
    completion,
    hasChanges,
    deviceSaved: snapshot.status === "saved",
  });
  const openCheckIn = () =>
    workspace.openDialog({ kind: "check-in", day, period });
  const closeCheckIn = () =>
    workspace.closeDialog({ kind: "check-in", day: targetDay, period });
  const returnToCard = () =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        "[data-check-in-day] [data-check-in-card]",
      ),
    ).find(
      (element) =>
        element
          .closest("[data-check-in-day]")
          ?.getAttribute("data-check-in-day") === targetDay &&
        element
          .closest("[data-check-in-period]")
          ?.getAttribute("data-check-in-period") === period &&
        !element.closest("[hidden]") &&
        element.getClientRects().length > 0,
    ) ?? null;

  const intakeSpacer = (
    <div
      className={styles.intakeSpacer}
      data-check-in-spacer={intakeSpacing}
      aria-hidden="true"
    />
  );

  return (
    <section
      className={styles.section}
      aria-label={saved ? `Your ${title}` : title}
      data-card-entry
      data-daily-check-in={saved ? "saved" : "prompt"}
      data-check-in-day={day}
      data-check-in-period={period}
    >
      {intakeSpacing === "before" && intakeSpacer}
      <div className={styles.cardFrame}>
        <SpecularCardBorder desktop />
        <MedicationCardBase
          color={CHECK_IN_CARD_COLOR}
          background={<CheckInCardSurface period={period} />}
          decoration={<SpecularCardBorder />}
          icon={morning ? "sun" : "moon-star"}
          leadingArtwork={<CheckInCardArtwork period={period} day={day} />}
          className={cn(styles.card, frameStyles.checkInBands)}
          data-check-in-card
          data-check-in-dialog-open={ownDialogOpen}
          data-filled={saved}
          data-complete={saved && completion.complete}
          onClick={() => openCheckIn()}
          aria-label={
            saved
              ? `Edit ${title}. ${logged?.label ?? "Last update time unavailable"}.`
              : `Write ${title}`
          }
          aria-describedby={
            feelingsId ? `${feelingsId} ${previewId}` : previewId
          }
          aria-haspopup="dialog"
          disabled={busy}
        >
          <div
            className={cn(
              "medication-card-details intake-card-details",
              eveningMoods && eveningMoods.length >= 3 && styles.manyFeelings,
            )}
          >
            <SavedCheckInHeading
              period={period}
              openedAt={openedAt}
              createdAt={saved ? checkIn?.createdAt : undefined}
              updatedAt={saved ? checkIn?.updatedAt : undefined}
              timeZone={timeZone}
              trailing={
                eveningMoods?.length ? (
                  <DailyMoodIndicators
                    id={feelingsId}
                    className={styles.summaryIcons}
                    moods={eveningMoods}
                  />
                ) : (
                  <span className={styles.summaryIcons} aria-hidden="true">
                    <span title={morning ? "Sleep duration" : "Last light"}>
                      {morning ? <BedDouble /> : <Sunset />}
                    </span>
                    <span title={morning ? feedback.label : "That’s a wrap"}>
                      {morning ? <StateIcon /> : <Clapperboard />}
                    </span>
                  </span>
                )
              }
            />
            <div
              className="medication-card-bottom intake-card-bottom"
              data-check-in-preview-row
              data-check-in-status={feedback.state}
            >
              <div className="intake-card-ingredient-group">
                <span
                  className={cn("intake-card-ingredient", styles.preview)}
                  data-check-in-completion-summary
                  title={hint}
                >
                  {hint}
                </span>
              </div>
              <span
                className={cn(
                  "intake-card-total",
                  "sample" in metric && metric.sample && styles.sampleMetric,
                )}
                data-sleep-sample={
                  ("sample" in metric && metric.sample) || undefined
                }
                aria-hidden="true"
                title={metric.description}
              >
                {"sample" in metric && metric.sample && (
                  <FlaskConical aria-hidden="true" />
                )}
                <span className="intake-card-total-value">
                  {metric.value || "\u200b"}
                </span>
                <span className="intake-card-total-unit">{metric.unit}</span>
              </span>
            </div>
          </div>
          <span id={previewId} className="sr-only">
            {metric.description} {feedback.description}
            {opened && ` ${opened.label}.`}
            {progress.visible &&
              ` ${progress.percent}% complete: ${progress.completion.completedCount} of ${progress.completion.totalCount} optional sections${hasChanges ? ", including your current edits" : ""}.`}
          </span>
        </MedicationCardBase>
      </div>
      {intakeSpacing === "after" && intakeSpacer}
      <ResponsiveModal
        showFooterNavigation={false}
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            if (next)
              workspace.openDialog({
                kind: "check-in",
                day: targetDay,
                period,
              });
            else closeCheckIn();
          }
        }}
        scrollKey={checkInDraftKey(targetDay, period)}
        returnFocus={returnToCard}
        headerVariant="check-in"
        title={
          <span className={styles.shinyTitle}>
            {checkInHeading(targetDay, period)}
          </span>
        }
        context={
          <JournalDialogSubheading
            title={
              <time dateTime={targetDay}>
                {checkInDatePrefix(targetDay, period)}{" "}
                {formatDay(targetDay, {
                  weekday: "long",
                  month: undefined,
                  day: undefined,
                })}{" "}
                {morning ? "Morning" : "Evening"}
              </time>
            }
            detail={formatDay(targetDay, { weekday: undefined, month: "long" })}
          />
        }
        description={
          morning
            ? "A little space for last night and how you’re waking up. Import a sleep report or enter what you know; every field is optional. Review the readings before saving, and come back later if the fog clears."
            : "A little space for what happened, how it felt and what helped. Write freely or pick the feelings that fit; every field is optional. Save what matters now, and come back later if the plot starts making sense."
        }
      >
        {open && (
          <CheckInForm
            key={checkInDraftKey(targetDay, period)}
            day={targetDay}
            period={period}
            checkIn={editing}
            onSaved={closeCheckIn}
          />
        )}
      </ResponsiveModal>
    </section>
  );
}

function CheckInForm({
  day,
  period,
  checkIn,
  onSaved,
}: {
  day: string;
  period: DailyCheckInPeriod;
  checkIn?: DailyCheckIn;
  onSaved: () => void;
}) {
  const { data, mutate, busy, derived } = useJournal();
  const { store } = useJournalWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const saveInFlight = useRef(false);
  const locked = busy || submitting;
  const morning = period === "morning";
  const id = useId();
  const draft = usePersistentDraft<CheckInDraft>(
    checkInDraftKey(day, period),
    () => ({
      ...checkInDefaults(checkIn, period),
      dailyWriting: true,
      note: "",
    }),
    isCheckInDraft,
  );
  const writing = useDailyWriting(day, data?.dailyCheckIns);
  const [openingWritingDraft] = useState(writing.draft);
  const { note } = writing;
  const journalHref = writing.page ? `/journal/${day}` : "/journal";
  const { moods, energy, stress, helped, writingOpen = false } = draft.value;
  // Earlier Morning drafts had only the legacy hours field. Keep it recoverable.
  const morningSleep = morningSleepForDraft(draft.value, checkIn);
  const setField = <K extends keyof CheckInDraft>(
    key: K,
    value: CheckInDraft[K],
  ) => draft.setValue((current) => ({ ...current, [key]: value }));
  const [reviewingReset, setReviewingReset] = useState(false);
  const reflectionSave = useReflectionSave({
    day,
    period,
    note,
    checkIn: writing.page,
    baseUpdatedAt: writing.baseUpdatedAt,
    acknowledge: writing.acknowledge,
    disabled: locked || reviewingReset,
  });
  const setRating = (field: "energy" | "stress", value: number | null) =>
    draft.setValue((current) => ({
      ...current,
      [field]: value,
      [`${field}Scale`]: 10,
    }));
  const setReminders = (items: ReminderItem[]) =>
    draft.setValue((current) => ({
      ...current,
      helped: serializeReminders(items),
      helpedList: items,
    }));
  const [issue, setIssue] = useState<
    "empty" | "sleep" | { message: string } | null
  >(null);
  const reset = () => {
    try {
      draft.resetDraft({
        ...checkInDefaults(checkIn, period),
        dailyWriting: true,
        note: "",
      });
      store.clearDraft(writing.key);
      setIssue(null);
    } finally {
      reflectionSave.resume();
    }
  };
  const hasContent =
    note.trim() ||
    moods.length ||
    energy !== null ||
    stress !== null ||
    helped.trim() ||
    (morning && hasMorningSleepContent(morningSleep));
  const sleepError =
    issue === "sleep" ? parseMorningSleepDraft(morningSleep).error : null;

  async function save() {
    if (locked || saveInFlight.current) return;
    const parsedMorning = morning ? parseMorningSleepDraft(morningSleep) : null;
    if (parsedMorning?.error) {
      setIssue("sleep");
      return;
    }
    if (!hasContent) {
      setIssue("empty");
      return;
    }
    setIssue(null);
    saveInFlight.current = true;
    setSubmitting(true);
    let saved = false;
    try {
      const key = checkInDraftKey(day, period);
      const hadDraft = Object.hasOwn(store.getSnapshot().drafts, key);
      const confirmed = await reflectionSave.pauseAndDrain();
      store.synchronize();
      const submittedRecord = store.getSnapshot().drafts[key];
      prepareCheckInSubmission(draft.value, submittedRecord?.value, hadDraft);
      const writingRecord = store.getSnapshot().drafts[writing.key];
      const latestWriting = writingRecord?.value;
      if (
        (isDailyWritingDraft(latestWriting) && latestWriting.note !== note) ||
        (writing.draft && !writingRecord && note !== confirmed.note)
      )
        throw new Error(
          "The daily page changed while you were saving. Review your writing and try again.",
        );
      const beforePreview = checkIn
        ? checkInNotificationSnapshot({
            ...checkIn,
            note: writing.page?.note ?? "",
          })
        : undefined;
      const result = await mutate("daily-check-ins", {
        day,
        period,
        note,
        sharedJournal: true,
        expectedUpdatedAt: isDailyWritingDraft(latestWriting)
          ? latestWriting.reflectionBaseUpdatedAt
          : confirmed.updatedAt,
        expectedCheckInAt: checkIn?.updatedAt ?? null,
        moods,
        energy,
        stress,
        energyScale: draft.value.energyScale ?? 5,
        stressScale: draft.value.stressScale ?? 5,
        helped,
        ...(morning
          ? {
              morningSleep: parsedMorning?.value ?? null,
              sleepHours:
                parsedMorning?.value?.totalSleepMinutes == null
                  ? null
                  : parsedMorning.value.totalSleepMinutes / 60,
            }
          : {}), // Removed Evening inputs never overwrite current saved sleep details.
      });
      const savedCheckIn = checkInForDay(
        result.data.dailyCheckIns,
        day,
        period,
      );
      if (!savedCheckIn)
        throw new Error(
          "Your save could not be confirmed. Your draft is still kept here; please try again.",
        );
      saved = true;
      // A different tab may have continued writing during this request. Import
      // its latest record before clearing only the exact draft we submitted.
      store.synchronize();
      if (
        writingRecord &&
        checkInSubmissionDraftUnchanged(
          writingRecord,
          store.getSnapshot().drafts[writing.key],
        )
      )
        store.clearDraft(writing.key);
      if (
        checkInSubmissionDraftUnchanged(
          submittedRecord,
          store.getSnapshot().drafts[key],
        )
      ) {
        draft.clearDraft();
      }
      toast.success(
        checkIn
          ? "Check-in updated."
          : period === "morning"
            ? "Your morning, saved."
            : "Your day, saved.",
        {
          journalScope: result.notificationScope,
          ...(result.unchanged ? { variant: "unchanged" as const } : {}),
          heading: `${period === "morning" ? "Morning" : "Evening"} check-in ${checkIn ? "updated" : "saved"}.`,
          undo: result.undo
            ? { onUndo: result.undo, receipt: result.receipt }
            : undefined,
          details: {
            ...(savedCheckIn
              ? {
                  preview: {
                    ...(beforePreview ? { before: beforePreview } : {}),
                    after: checkInNotificationSnapshot({
                      ...savedCheckIn,
                      note,
                    }),
                  },
                }
              : {}),
            paragraphs: [
              "Your writing and check-in details are saved for this tracking day. Reopen the check-in whenever you want to add or change something.",
            ],
            facts: [
              { label: "Tracking day", value: formatDay(day) },
              {
                label: "Moods",
                value:
                  DAILY_MOODS.filter((mood) => moods.includes(mood.value))
                    .map((mood) => mood.label)
                    .join(", ") || "Not recorded",
              },
              {
                label: "Journal writing",
                value: note.trim() ? "Included" : "Not added",
              },
            ],
            links: [
              {
                label: "Edit this check-in",
                href: `/history/${day}?checkin=${period}`,
              },
              { label: "Browse Past Days", href: "/history" },
            ],
            footer: "Check-ins are saved separately from intake entries.",
          },
        },
      );
      onSaved();
    } catch (error) {
      // Server conflicts and concurrent local edits both keep the full draft.
      setIssue({
        message:
          error instanceof Error
            ? error.message
            : "Your check-in could not be saved. Your draft is still kept here.",
      });
    } finally {
      saveInFlight.current = false;
      if (!saved) {
        reflectionSave.resume();
        setSubmitting(false);
      }
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      aria-busy={locked}
      data-check-in-form={period}
    >
      <CheckInSection
        caption="Daily Journal"
        headingId={`${id}-journal-heading`}
        context={morning ? "First light" : "After hours"}
        description={
          morning
            ? "What do you want to remember once the day gets loud? Leave a line here. Your evening check-in opens this same page."
            : "What looked different by the end of the day? This is the same page you had this morning, with room for a change of heart."
        }
        detail={
          <Link
            href={journalHref}
            className="inline-flex items-center gap-1.5"
            onNavigate={() => {
              onSaved?.();
              rememberJournalDestination(journalHref);
            }}
          >
            <LibraryBig size={14} aria-hidden="true" />
            {writing.page ? "Saved page" : "All journals"}
            <ArrowUpRight size={12} className="opacity-60" aria-hidden="true" />
          </Link>
        }
      >
        <DailyReflectionEditor
          id={`${id}-note`}
          value={note}
          onChange={writing.setNote}
          day={day}
          period={period}
          open={writingOpen}
          onOpenChange={(value) => setField("writingOpen", value)}
          draftStatus={
            draft.hasDraft || writing.draft ? draft.status : undefined
          }
          saving={reflectionSave.controls}
          savedAt={writing.page?.updatedAt}
          disabled={locked}
        />
      </CheckInSection>

      {morning ? (
        <MorningSleepFields
          id={`${id}-morning`}
          value={morningSleep}
          onChange={(value) => setField("morningSleep", value)}
          disabled={locked}
        />
      ) : (
        <div className={styles.eveningFields} data-evening-check-in-fields>
          <CheckInSection
            caption={
              <>
                <Moon aria-hidden="true" />
                Emotional Autopsy
              </>
            }
            headingId={`${id}-feelings-heading`}
            context="What lingered?"
            detail={
              <>
                <strong>{DAILY_MOOD_CHOICES.length}</strong> feelings
              </>
            }
            description="Pick as many feelings as fit, including the contradictory ones. A bad moment doesn’t have to become the verdict on your whole day."
          >
            <section
              className={styles.feelingsSection}
              aria-labelledby={`${id}-feelings-heading`}
              data-evening-feelings
            >
              <DailyMoodPicker
                cachedUsage={derived?.moodUsage}
                value={moods}
                onChange={(value) => setField("moods", value)}
                checkIns={data?.dailyCheckIns}
                seed={`${day}:${period}`}
                disabled={locked}
              />
              <hr className={styles.feelingsDivider} />
              <EveningDayRatings
                id={`${id}-ratings`}
                day={day}
                energy={energy}
                stress={stress}
                energyScale={draft.value.energyScale}
                stressScale={draft.value.stressScale}
                checkIns={data?.dailyCheckIns}
                disabled={locked}
                onEnergyChange={(value) => setRating("energy", value)}
                onStressChange={(value) => setRating("stress", value)}
              />
            </section>
          </CheckInSection>
          <CheckInSection
            caption={
              <>
                <ActionIcon name="sparkle" />
                Worth a Repeat
              </>
            }
            headingId={`${id}-helped-heading`}
            context="What worked"
            detail={`${remindersCount(helped)} ${remindersCount(helped) === 1 ? "Item" : "Items"}`}
          >
            <SmallReminders
              id={`${id}-helped`}
              items={reminderItems(helped, draft.value.helpedList)}
              onChange={setReminders}
              disabled={locked}
            />
          </CheckInSection>
        </div>
      )}

      {issue === "empty" && !hasContent && (
        <DialogErrorPanel
          title="One detail is enough"
          message={
            morning
              ? "Add a few words, a sleep rating, or one detail before saving."
              : "Add writing, a mood, or another detail before saving."
          }
          jump={
            morning
              ? {
                  label: "Rate your sleep",
                  selector: '[data-sleep-field="sleepQuality"]',
                }
              : {
                  label: "Find a feeling",
                  selector: '[data-mood-library] input[type="search"]',
                }
          }
          action={{
            label: "Write a note",
            onClick: () => setField("writingOpen", true),
          }}
        />
      )}
      {sleepError && (
        <DialogErrorPanel
          title="Check your sleep details"
          message={sleepError}
        />
      )}
      {issue && typeof issue === "object" && (
        <DialogErrorPanel
          title="Couldn’t save your check-in"
          message={issue.message}
        />
      )}
      <div
        className={styles.submitArea}
        data-dialog-fade-footer
        data-check-in-submit
      >
        <div className="flex w-full flex-col" data-draft-action-footer>
          <IntakePrimaryButton
            type="submit"
            disabled={locked}
            pending={locked}
            secondaryText={locked ? undefined : "Keep it!"}
            symbol={
              <span className="intake-log-symbol" aria-hidden="true">
                <Save
                  className="intake-log-symbol-pill"
                  size={23}
                  strokeWidth={3.25}
                />
              </span>
            }
          >
            {locked ? "Saving…" : "Save Check-In"}
          </IntakePrimaryButton>
          <DraftStatus
            {...draft}
            hasDraft={draft.hasDraft || Boolean(writing.draft)}
            restored={
              (draft.hasDraft && draft.restored) ||
              Boolean(writing.draft && writing.draft === openingWritingDraft)
            }
            copy={{
              idle: checkIn
                ? "Saved to this day. Edit anytime."
                : "Save to this day. Edit anytime.",
            }}
          />
          <DraftResetFooter
            saveLabel="Save Check-In"
            subject={`${morning ? "Morning" : "Evening"} check-in · ${formatDay(day)}`}
            resetDetail={`${morning ? "Sleep readings and ratings" : "Feelings, ratings and reminders"} ${checkIn ? "return to their saved values" : "will be cleared"}. Unsaved writing on the shared daily page also returns to its last save.`}
            keptDetail="Your saved daily journal, recorded check-ins and intakes stay on this day."
            hasDraft={draft.hasDraft || Boolean(writing.draft)}
            durable={draft.status === "saved"}
            canReset={draft.hasDraft || Boolean(writing.draft)}
            busy={locked}
            prepareReset={reflectionSave.pauseAndDrain}
            onReviewChange={setReviewingReset}
            onReset={reset}
          />
        </div>
      </div>
    </form>
  );
}
