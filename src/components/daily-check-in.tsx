"use client";

import { useId, useState, useSyncExternalStore } from "react";
import {
  BedDouble,
  BookOpen,
  BookOpenCheck,
  Flower2,
  HeartHandshake,
  PencilLine,
  SlidersHorizontal,
  Smile,
} from "lucide-react";
import { BatteryMediumIcon } from "@phosphor-icons/react/dist/ssr/BatteryMedium";
import { WavesIcon } from "@phosphor-icons/react/dist/ssr/Waves";
import { toast } from "@/components/ui/journal-toast";
import { checkInNotificationSnapshot } from "@/lib/notification-change-preview";
import { ActionIcon } from "@/components/action-icon";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationCardBase } from "@/components/medication-card-base";
import { SpecularRim } from "@/components/specular-rim";
import { SavedCheckInHeading } from "@/components/saved-check-in-heading";
import {
  CHECK_IN_CARD_COLOR,
  CheckInCardArtwork,
} from "@/components/check-in-card-artwork";
import { getCheckInCardMetric } from "@/lib/check-in-card-metric";
import { CheckInRating } from "@/components/check-in-rating";
import {
  checkInRatingForSlider,
  type CheckInRatingScale,
} from "@/lib/check-in-rating";
import { getCheckInCardProgress } from "@/lib/check-in-card-progress";
import { useJournal } from "@/components/journal-provider";
import {
  DraftStatus,
  useJournalWorkspace,
  usePersistentDraft,
} from "@/components/journal-drafts";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckInSection } from "./check-in-section";
import { DailyMoodPicker } from "@/components/daily-mood-picker";
import { DailyReflectionEditor } from "@/components/daily-reflection-editor";
import { useReflectionSave } from "@/components/use-reflection-save";
import {
  MorningSleepFields,
  MorningSleepSummary,
} from "@/components/morning-sleep-fields";
import {
  hasMorningSleepContent,
  parseMorningSleepDraft,
} from "@/lib/morning-sleep";
import {
  DAILY_MOODS,
  WHAT_HELPED_MAX_LENGTH,
  checkInForDay,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "@/lib/daily-check-in";
import { checkInHeading } from "@/lib/check-in-headings";
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
  const { data, busy } = useJournal();
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
  const snapshot = useSyncExternalStore(
    workspace.store.subscribe,
    workspace.store.getSnapshot,
    workspace.store.getServerSnapshot,
  );
  const storedDraft = snapshot.drafts[checkInDraftKey(day, period)]?.value;
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
  const openedAt = snapshot.checkInOpenedAt[checkInDraftKey(day, period)];
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
      <MedicationCardBase
        color={CHECK_IN_CARD_COLOR}
        decoration={
          <span
            className={styles.outerFrame}
            data-specular-frame
            aria-hidden="true"
          >
            <SpecularRim
              palette="triad"
              glow={false}
              className={styles.outerLight}
            />
          </span>
        }
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
              className="intake-card-total"
              aria-hidden="true"
              title={metric.description}
            >
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
        title={checkInHeading(targetDay, period)}
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
          <time dateTime={targetDay} className={styles.headerDate}>
            {formatDay(targetDay, {
              weekday: "long",
              month: undefined,
              day: undefined,
            })}
            <small>
              <span aria-hidden="true">/</span>{" "}
              {formatDay(targetDay, { weekday: undefined, month: "long" })}
            </small>
          </time>
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

function RatingField({
  id,
  label,
  scale = 5,
  value,
  onChange,
  disabled,
  icon,
  low,
  high,
}: {
  id: string;
  label: string;
  scale?: CheckInRatingScale;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled: boolean;
  icon: "energy" | "stress";
  low: string;
  high: string;
}) {
  const Icon = icon === "energy" ? BatteryMediumIcon : WavesIcon;
  return (
    <CheckInRating
      id={id}
      name={icon}
      label={label}
      value={checkInRatingForSlider(value, scale)}
      low={low}
      high={high}
      disabled={disabled}
      onChange={onChange}
      icon={<Icon size={15} weight="bold" aria-hidden="true" />}
      description={
        scale === 5 && value !== null
          ? `Previously rated ${value} of 5. Move the slider to choose a new rating.`
          : undefined
      }
    />
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
  const { data, mutate, busy } = useJournal();
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
  const setHelped = (value: string) => setField("helped", value);
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
        caption="Journal entry"
        left="Markdown supported"
        right="Drafts saved as you write"
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
          onLibraryNavigate={onSaved}
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
            caption="Evening reflection"
            left="Pick up to four moods"
            right="Ratings are optional"
          >
            <section
              className={styles.feelingsSection}
              aria-labelledby={`${id}-feelings-heading`}
              data-evening-feelings
            >
              <div className={styles.feelingsHeading}>
                <span className={styles.feelingsMark} aria-hidden="true">
                  <HeartHandshake size={21} strokeWidth={2.1} />
                </span>
                <div>
                  <h3 id={`${id}-feelings-heading`}>Your Day, Your Mood</h3>
                  <p>
                    A few shades of today. A mix is welcome; every part is
                    optional.
                  </p>
                </div>
              </div>
              <CheckInSection
                caption="Feelings"
                left="Search by name"
                right="Tap a pick to remove it"
              >
                <fieldset
                  className={styles.moodField}
                  disabled={locked}
                  data-check-in-section="mood"
                >
                  <legend className={styles.moodLegend}>
                    <span className={styles.fieldHeading}>
                      <Flower2 size={17} strokeWidth={2.1} />
                      Today Felt Like
                    </span>
                    <span className={styles.optional}>{moods.length} / 4</span>
                  </legend>
                  <p className={styles.fieldHint}>
                    Choose up to four. There is room for mixed feelings.
                  </p>
                  <DailyMoodPicker
                    value={moods}
                    onChange={(value) => setField("moods", value)}
                    checkIns={data?.dailyCheckIns}
                    seed={`${day}:${period}`}
                    disabled={locked}
                  />
                </fieldset>
              </CheckInSection>

              <CheckInSection
                caption="Daily ratings"
                left="Energy & stress"
                right="Scale of 1–10"
              >
                <section
                  className={styles.formSection}
                  aria-labelledby={`${id}-ratings-heading`}
                >
                  <div className={styles.sectionHeading}>
                    <h3 id={`${id}-ratings-heading`}>
                      <SlidersHorizontal
                        size={17}
                        strokeWidth={2.1}
                        aria-hidden="true"
                      />
                      How Your Day Felt
                    </h3>
                    <span>1–10 · Optional</span>
                  </div>
                  <p className={styles.fieldHint}>
                    Slide or tap to rate. Leave anything blank.
                  </p>
                  <div className={styles.ratingRow}>
                    <RatingField
                      id={`${id}-energy`}
                      label="Energy"
                      scale={draft.value.energyScale}
                      icon="energy"
                      value={energy}
                      onChange={(value) => setRating("energy", value)}
                      disabled={locked}
                      low="Low"
                      high="Full"
                    />
                    <RatingField
                      id={`${id}-stress`}
                      label="Stress"
                      scale={draft.value.stressScale}
                      icon="stress"
                      value={stress}
                      onChange={(value) => setRating("stress", value)}
                      disabled={locked}
                      low="Low"
                      high="High"
                    />
                  </div>
                </section>
              </CheckInSection>
            </section>
          </CheckInSection>
          <CheckInSection
            caption="Small reminders"
            left="One thought per line"
            right="Optional"
          >
            <div
              className={cn(
                styles.field,
                styles.helpedField,
                styles.formSection,
              )}
              data-check-in-section="helped"
            >
              <div className={styles.helpedHeading}>
                <Label htmlFor={`${id}-helped`}>
                  <ActionIcon name="sparkle" className="size-4" />
                  Things That Helped
                </Label>
                <span
                  aria-label={`${helped.length} of ${WHAT_HELPED_MAX_LENGTH} characters`}
                >
                  {helped.length} / {WHAT_HELPED_MAX_LENGTH}
                </span>
              </div>
              <p id={`${id}-helped-hint`} className={styles.helpedHint}>
                What made today a little easier? Give each thing its own line if
                you like.
              </p>
              <Textarea
                id={`${id}-helped`}
                aria-describedby={`${id}-helped-hint`}
                rows={3}
                value={helped}
                maxLength={WHAT_HELPED_MAX_LENGTH}
                onChange={(event) => setHelped(event.target.value)}
                placeholder={"A walk before lunch\nA friend who listened"}
                disabled={locked}
                className={styles.helpedInput}
              />
            </div>
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
        data-check-in-submit
        data-has-sleep-summary={morning || undefined}
      >
        {morning && <MorningSleepSummary value={morningSleep} />}
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
