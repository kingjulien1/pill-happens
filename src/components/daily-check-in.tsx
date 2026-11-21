"use client";

import { useCallback, useId, useState } from "react";
import {
  BedDouble,
  FlaskConical,
  Coffee,
  Moon,
  BookOpen,
  BookOpenCheck,
  PencilLine,
  Smile,
} from "lucide-react";
import { toast } from "@/components/ui/journal-toast";
import { checkInNotificationSnapshot } from "@/lib/notification-change-preview";
import { ActionIcon } from "@/components/action-icon";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationCardBase } from "@/components/medication-card-base";
import { CheckInCardBorder as SpecularCardBorder } from "@/components/check-in-card-border";
import { SavedCheckInHeading } from "@/components/saved-check-in-heading";
import {
  CHECK_IN_CARD_COLOR,
  CheckInCardArtwork,
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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, LibraryBig } from "lucide-react";
import { rememberJournalDestination } from "@/components/journal-drafts";
import { CheckInSection } from "./check-in-section";
import { EveningDayRatings } from "@/components/evening-day-ratings";
import { SmallReminders } from "@/components/small-reminders";
import {
  reminderItems,
  remindersCount,
  serializeReminders,
  type ReminderItem,
} from "@/lib/check-in-reminders";
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
  isCheckInOpenedTimestamp,
  getCheckInUpdatedTime,
} from "@/lib/check-in-logged-time";
import { cn } from "@/lib/utils";
import styles from "./daily-check-in.module.css";
import closeStyles from "./dialog-close.module.css";

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
  const formId = useId();
  const completion = morning
    ? getMorningCheckInCompletion(saved ? checkIn : undefined)
    : getCheckInCompletion(saved ? checkIn : undefined);
  const selectCardDraft = useCallback(
    (snapshot: WorkspaceSnapshot) => ({
      draft: snapshot.drafts[checkInDraftKey(day, period)]?.value,
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
  const storedDraft = snapshot.draft;
  const hasChanges = hasCheckInDraftChanges(
    storedDraft,
    currentCheckIn,
    period,
  );
  const progress = getCheckInCardProgress({
    period,
    checkIn: currentCheckIn,
    draft: storedDraft,
  });
  const hint = morning ? "Still here. Take stock." : "Survived? Leave notes.";
  const openedAt = snapshot.openedAt;
  const opened = getCheckInOpenedTime(openedAt, timeZone);
  const dormantProgress =
    !progress.visible && !isCheckInOpenedTimestamp(openedAt);
  // Only this card's editor may replay its artwork; restored older days stay scoped.
  const ownDialogOpen = open && targetDay === day;
  const artworkReplayKey = `${day}:${period}:${ownDialogOpen}:${progress.visible}:${progress.percent}:${dormantProgress}`;
  const metric = getCheckInCardMetric(
    period,
    currentCheckIn,
    hasChanges && isCheckInDraft(storedDraft) ? storedDraft : undefined,
    morning
      ? (derived?.sleepAverage ?? recordedSleepAverage(data?.dailyCheckIns))
      : undefined,
  );
  const MetricIcon = morning ? BedDouble : Smile;
  const StateIcon = hasChanges ? PencilLine : saved ? BookOpenCheck : BookOpen;
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
          decoration={<SpecularCardBorder />}
          icon={morning ? "sun" : "moon-star"}
          leadingArtwork={
            <CheckInCardArtwork
              period={period}
              replayKey={artworkReplayKey}
              dialogOpen={ownDialogOpen}
            />
          }
          className={cn(styles.card, "check-in-icon-theme")}
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
          aria-describedby={previewId}
          aria-haspopup="dialog"
          disabled={busy}
        >
          <div className="medication-card-details intake-card-details">
            <SavedCheckInHeading
              period={period}
              openedAt={openedAt}
              createdAt={saved ? checkIn?.createdAt : undefined}
              updatedAt={saved ? checkIn?.updatedAt : undefined}
              timeZone={timeZone}
              trailing={
                <span className={styles.summaryIcons} aria-hidden="true">
                  <span title={morning ? "Sleep duration" : "Selected moods"}>
                    <MetricIcon />
                  </span>
                  <span title={feedback.label}>
                    <StateIcon />
                  </span>
                </span>
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
        headerActions={
          <Button
            type="reset"
            form={formId}
            variant="ghost"
            size="icon"
            className={closeStyles.control}
            disabled={busy}
            aria-label="Reset check-in draft"
            title="Reset Draft"
            data-check-in-reset
          >
            <ActionIcon name="retry" className="size-[18px]" />
          </Button>
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
            ? "A little space for last night and how you’re waking up. Start anywhere; every field is optional."
            : "Your evening journal: room for your thoughts, moods and the details you want to keep. Every field is optional."
        }
      >
        {open && (
          <CheckInForm
            key={checkInDraftKey(targetDay, period)}
            formId={formId}
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
  formId,
  day,
  period,
  checkIn,
  onSaved,
}: {
  formId: string;
  day: string;
  period: DailyCheckInPeriod;
  checkIn?: DailyCheckIn;
  onSaved: () => void;
}) {
  const { data, mutate, busy, derived } = useJournal();
  const { store } = useJournalWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const locked = busy || submitting;
  const morning = period === "morning";
  const id = useId();
  const draft = usePersistentDraft(
    checkInDraftKey(day, period),
    () => checkInDefaults(checkIn, period),
    isCheckInDraft,
  );
  const {
    note,
    moods,
    energy,
    stress,
    helped,
    writingOpen = false,
  } = draft.value;
  // Earlier Morning drafts had only the legacy hours field. Keep it recoverable.
  const morningSleep = morningSleepForDraft(draft.value, checkIn);
  const setField = <K extends keyof CheckInDraft>(
    key: K,
    value: CheckInDraft[K],
  ) => draft.setValue((current) => ({ ...current, [key]: value }));
  const setNote = (value: string) =>
    draft.setValue((current) => ({
      ...current,
      note: value,
      ...(current.reflectionBaseUpdatedAt === undefined &&
      current.note === (checkIn?.note ?? "")
        ? { reflectionBaseUpdatedAt: checkIn?.updatedAt ?? null }
        : {}),
    }));
  const reflectionSave = useReflectionSave({
    day,
    period,
    note,
    checkIn,
    baseUpdatedAt: draft.value.reflectionBaseUpdatedAt,
    setDraft: draft.setValue,
    disabled: locked,
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
  const [error, setError] = useState("");
  const reset = () => {
    draft.resetDraft(checkInDefaults(checkIn, period));
    setError("");
  };
  const hasContent =
    note.trim() ||
    moods.length ||
    energy !== null ||
    stress !== null ||
    helped.trim() ||
    (morning && hasMorningSleepContent(morningSleep));

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    const parsedMorning = morning ? parseMorningSleepDraft(morningSleep) : null;
    if (parsedMorning?.error) {
      setError(parsedMorning.error);
      return;
    }
    if (!hasContent) {
      setError(
        morning
          ? "Add a few words, a sleep rating, or one detail before saving."
          : "Add writing, a mood, or another detail before saving.",
      );
      return;
    }
    setError("");
    setSubmitting(true);
    let saved = false;
    try {
      const key = checkInDraftKey(day, period);
      const hadDraft = Object.hasOwn(store.getSnapshot().drafts, key);
      await reflectionSave.pauseAndDrain();
      store.synchronize();
      const submittedRecord = store.getSnapshot().drafts[key];
      const submission = prepareCheckInSubmission(
        draft.value,
        submittedRecord?.value,
        hadDraft,
      );
      const beforePreview = checkIn
        ? checkInNotificationSnapshot(checkIn)
        : undefined;
      const result = await mutate("daily-check-ins", {
        day,
        period,
        note,
        expectedUpdatedAt: submission.reflectionBaseUpdatedAt,
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
      saved = true;
      // A different tab may have continued writing during this request. Import
      // its latest record before clearing only the exact draft we submitted.
      store.synchronize();
      if (
        checkInSubmissionDraftUnchanged(
          submittedRecord,
          store.getSnapshot().drafts[key],
        )
      )
        draft.clearDraft();
      toast.success(
        checkIn
          ? "Check-in updated."
          : period === "morning"
            ? "Your morning, saved."
            : "Your day, saved.",
        {
          journalScope: result.notificationScope,
          heading: `${period === "morning" ? "Morning" : "Evening"} check-in`,
          undo: result.undo
            ? { onUndo: result.undo, receipt: result.receipt }
            : undefined,
          details: {
            ...(savedCheckIn
              ? {
                  preview: {
                    ...(beforePreview ? { before: beforePreview } : {}),
                    after: checkInNotificationSnapshot(savedCheckIn),
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
      setError(
        error instanceof Error
          ? error.message
          : "Your check-in could not be saved. Your draft is still kept here.",
      );
    } finally {
      if (!saved) {
        reflectionSave.resume();
        setSubmitting(false);
      }
    }
  }

  return (
    <form
      id={formId}
      className={styles.form}
      onSubmit={save}
      onReset={(event) => {
        event.preventDefault();
        if (!locked) reset();
      }}
      aria-busy={locked}
      data-check-in-form={period}
    >
      <CheckInSection
        caption={
          <>
            {morning ? (
              <Coffee aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
            Your {morning ? "Morning" : "Day"}, Your Words
          </>
        }
        headingId={`${id}-journal-heading`}
        description={
          morning
            ? "What was on your mind when you woke up? Start with the thought that stayed with you."
            : "What stayed with you today? Pick one moment you’d like to remember."
        }
        detail={
          <Link
            href="/journal"
            className="inline-flex items-center gap-1.5"
            onNavigate={() => {
              onSaved?.();
              rememberJournalDestination("/journal");
            }}
          >
            <LibraryBig size={14} aria-hidden="true" />
            All journals
            <ArrowUpRight size={12} className="opacity-60" aria-hidden="true" />
          </Link>
        }
      >
        <DailyReflectionEditor
          id={`${id}-note`}
          value={note}
          onChange={setNote}
          day={day}
          period={period}
          open={writingOpen}
          onOpenChange={(value) => setField("writingOpen", value)}
          draftStatus={draft.hasDraft ? draft.status : undefined}
          saving={reflectionSave.controls}
          savedAt={checkIn?.updatedAt}
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
                Your Day, Your Mood
              </>
            }
            headingId={`${id}-feelings-heading`}
            context="Room for mixed feelings."
            detail={
              <>
                <strong>{DAILY_MOOD_CHOICES.length}</strong> feelings
              </>
            }
          >
            <section
              className={styles.feelingsSection}
              aria-labelledby={`${id}-feelings-heading`}
              data-evening-feelings
            >
              <fieldset
                className={styles.moodField}
                disabled={locked}
                data-check-in-section="mood"
              >
                <legend className="sr-only">Today Felt Like</legend>
                <DailyMoodPicker
                  cachedUsage={derived?.moodUsage}
                  value={moods}
                  onChange={(value) => setField("moods", value)}
                  checkIns={data?.dailyCheckIns}
                  seed={`${day}:${period}`}
                  disabled={locked}
                />
              </fieldset>
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
                Small Reminders
              </>
            }
            headingId={`${id}-helped-heading`}
            context="What Helped"
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

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div
        className={styles.submitArea}
        data-dialog-fade-footer
        data-check-in-submit
      >
        <div className="flex w-full flex-col gap-2" data-draft-action-footer>
          <DialogPrimaryButton
            type="submit"
            disabled={locked}
            pending={locked}
            className="w-full rounded-2xl"
          >
            {locked
              ? period === "morning"
                ? "Saving Your Morning…"
                : "Saving Your Day…"
              : "Save Check-In"}
          </DialogPrimaryButton>
          <DraftStatus {...draft} />
        </div>
        <p className={styles.saveHint}>
          Saved to this day. Come back and edit whenever you like.
        </p>
      </div>
    </form>
  );
}
