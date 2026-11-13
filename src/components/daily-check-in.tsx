"use client";

import {
  useId,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { BatteryMediumIcon } from "@phosphor-icons/react/dist/ssr/BatteryMedium";
import { WavesIcon } from "@phosphor-icons/react/dist/ssr/Waves";
import { toast } from "@/components/ui/journal-toast";
import { ActionIcon } from "@/components/action-icon";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationCardBase } from "@/components/medication-card-base";
import { SavedCheckInHeading } from "@/components/saved-check-in-heading";
import { CheckInCardArtwork } from "@/components/check-in-card-artwork";
import { CheckInCardProgress } from "@/components/check-in-card-progress";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  checkInForDay,
  type DailyCheckIn,
  type DailyCheckInPeriod,
  type DailyMood,
} from "@/lib/daily-check-in";
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
import groupStyles from "./intake-group-spacing.module.css";

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
  const progressIndicator = (
    <CheckInCardProgress
      progress={progress}
      dormant={dormantProgress}
      period={period}
      replayKey={artworkReplayKey}
      dialogOpen={ownDialogOpen}
    />
  );
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
        color="amber"
        icon={morning ? "sun" : "moon-star"}
        leadingArtwork={
          <CheckInCardArtwork
            period={period}
            replayKey={artworkReplayKey}
            dialogOpen={ownDialogOpen}
          />
        }
        className={cn(styles.card, "check-in-icon-theme")}
        background={
          <span
            className={cn(styles.background, groupStyles.base)}
            aria-hidden="true"
            data-check-in-background
            data-check-in-base
          />
        }
        style={
          {
            "--entry-color": "var(--check-in-accent)",
            "--intake-identity-color": "var(--check-in-art-base)",
          } as CSSProperties
        }
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
        <div
          className={cn(
            "medication-card-details intake-card-details",
            styles.details,
          )}
          data-has-progress="true"
        >
          <SavedCheckInHeading
            period={period}
            openedAt={openedAt}
            createdAt={saved ? checkIn?.createdAt : undefined}
            updatedAt={saved ? checkIn?.updatedAt : undefined}
            timeZone={timeZone}
          />
          <div
            className={cn(
              "medication-card-bottom intake-card-bottom",
              styles.bottom,
            )}
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
          </div>
          {progressIndicator}
        </div>
        <span id={previewId} className="sr-only">
          {feedback.description}
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
        title={title}
        titleIcon={morning ? "coffee" : "shootingStar"}
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
        context={formatDay(targetDay, {
          weekday: "short",
          month: "short",
        })}
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
  const { mutate, busy } = useJournal();
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
    sleepHours,
    bedtime = checkIn?.bedtime ?? "",
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
  const setMoods = (
    next: DailyMood[] | ((current: DailyMood[]) => DailyMood[]),
  ) =>
    draft.setValue((current) => ({
      ...current,
      moods: typeof next === "function" ? next(current.moods) : next,
    }));
  const setRating = (field: "energy" | "stress", value: number | null) =>
    draft.setValue((current) => ({
      ...current,
      [field]: value,
      [`${field}Scale`]: 10,
    }));
  const setSleepHours = (value: string) => setField("sleepHours", value);
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
    (morning
      ? hasMorningSleepContent(morningSleep)
      : sleepHours !== "" || bedtime !== "");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    if (
      !morning &&
      bedtime !== "" &&
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(bedtime)
    ) {
      setError("Choose a valid bedtime, or leave it blank.");
      return;
    }
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
      await reflectionSave.pauseAndDrain();
      await mutate("daily-check-ins", {
        day,
        period,
        note,
        moods,
        energy,
        stress,
        energyScale: draft.value.energyScale ?? 5,
        stressScale: draft.value.stressScale ?? 5,
        sleepHours: morning
          ? parsedMorning?.value?.totalSleepMinutes == null
            ? null
            : parsedMorning.value.totalSleepMinutes / 60
          : sleepHours === ""
            ? null
            : Number(sleepHours),
        helped,
        ...(morning
          ? { morningSleep: parsedMorning?.value ?? null }
          : draft.value.bedtime === undefined
            ? {} // An older restored draft must not erase a newer saved clock.
            : { bedtime: bedtime === "" ? null : bedtime }),
      });
      saved = true;
      draft.clearDraft();
      toast.success(
        checkIn
          ? "Check-in updated."
          : period === "morning"
            ? "Your morning, saved."
            : "Your day, saved.",
        {
          heading: `${period === "morning" ? "Morning" : "Evening"} check-in`,
        },
      );
      onSaved();
    } catch {
      // The provider shows the save error; keep the complete draft open.
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

      {morning ? (
        <MorningSleepFields
          id={`${id}-morning`}
          value={morningSleep}
          onChange={(value) => setField("morningSleep", value)}
          disabled={locked}
        />
      ) : (
        <div className={styles.eveningFields} data-evening-check-in-fields>
          <fieldset
            className={styles.moodField}
            disabled={locked}
            data-check-in-section="mood"
          >
            <legend className={styles.moodLegend}>
              <span className={styles.fieldHeading}>
                <ActionIcon name="flower" className="size-4" />
                Today Felt Like
              </span>
              <span className={styles.optional}>{moods.length} / 4</span>
            </legend>
            <p className={styles.fieldHint}>A mix is okay. Pick up to four.</p>
            <div className={styles.moodGrid}>
              {DAILY_MOODS.map((mood) => {
                const selected = moods.includes(mood.value);
                return (
                  <button
                    key={mood.value}
                    type="button"
                    aria-pressed={selected}
                    className={styles.mood}
                    disabled={!selected && moods.length >= 4}
                    onClick={() =>
                      setMoods((current) =>
                        current.includes(mood.value)
                          ? current.filter((value) => value !== mood.value)
                          : [...current, mood.value],
                      )
                    }
                  >
                    <span className={styles.moodEmoji} aria-hidden="true">
                      {mood.emoji}
                    </span>
                    <span>{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section
            className={styles.formSection}
            aria-labelledby={`${id}-ratings-heading`}
          >
            <div className={styles.sectionHeading}>
              <h3 id={`${id}-ratings-heading`}>How your day felt</h3>
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

          <section
            className={styles.formSection}
            aria-labelledby={`${id}-sleep-heading`}
          >
            <div className={styles.sectionHeading}>
              <h3 id={`${id}-sleep-heading`}>Sleep & tonight</h3>
              <span>Optional</span>
            </div>
            <div className={styles.detailsRow}>
              <div className={styles.field} data-check-in-section="sleep">
                <Label htmlFor={`${id}-sleep`}>
                  <MoonStarsIcon size={15} weight="bold" aria-hidden="true" />
                  Last Night
                </Label>
                <div className={styles.sleepInput}>
                  <Input
                    id={`${id}-sleep`}
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    inputMode="decimal"
                    value={sleepHours}
                    onChange={(event) => setSleepHours(event.target.value)}
                    placeholder="—"
                    disabled={locked}
                    className={cn(styles.detailInput, styles.sleepHoursInput)}
                    aria-label="Hours Slept Last Night"
                    aria-describedby={`${id}-sleep-hint`}
                  />
                  <span aria-hidden="true">h</span>
                </div>
                <p id={`${id}-sleep-hint`} className={styles.bedtimeHint}>
                  Hours you slept before today.
                </p>
              </div>
              <div className={styles.field} data-check-in-field="bedtime">
                <Label htmlFor={`${id}-bedtime`}>Tonight’s bedtime</Label>
                <Input
                  id={`${id}-bedtime`}
                  name="bedtime"
                  type="time"
                  step={60}
                  value={bedtime}
                  onChange={(event) => setField("bedtime", event.target.value)}
                  disabled={locked}
                  className={cn(styles.detailInput, styles.bedtimeInput)}
                  aria-describedby={`${id}-bedtime-hint`}
                  data-check-in-bedtime
                />
                <p id={`${id}-bedtime-hint`} className={styles.bedtimeHint}>
                  Updates the end of your daily log.
                </p>
              </div>
            </div>
          </section>
          <div
            className={cn(styles.field, styles.helpedField, styles.formSection)}
            data-check-in-section="helped"
          >
            <Label htmlFor={`${id}-helped`}>
              <ActionIcon name="sparkle" className="size-4" />
              One Thing That Helped
            </Label>
            <Input
              id={`${id}-helped`}
              value={helped}
              maxLength={160}
              onChange={(event) => setHelped(event.target.value)}
              placeholder="A walk, a chat…"
              disabled={locked}
              className={styles.detailInput}
            />
          </div>
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
