import {
  checkInDefaults,
  hasCheckInDraftChanges,
  isCheckInDraft,
  morningSleepForDraft,
  type CheckInDraft,
} from "./check-in-draft";
import {
  getCheckInCompletion,
  getMorningCheckInCompletion,
  type CheckInSectionId,
  type MorningCheckInSectionId,
} from "./check-in-completion";
import type { DailyCheckIn, DailyCheckInPeriod } from "./daily-check-in";
import {
  MORNING_SLEEP_RATING_FIELDS,
  morningSleepDefaults,
  parseMorningSleepDraft,
  type MorningSleepDraft,
} from "./morning-sleep";

/** This answer-shaped projection is never a journal record or a save payload. */
function draftAnswers(
  draft: CheckInDraft,
  checkIn: DailyCheckIn | undefined,
  period: DailyCheckInPeriod,
): DailyCheckIn {
  return {
    day: checkIn?.day ?? "",
    period,
    note: draft.note,
    moods: [...draft.moods],
    energy: draft.energy,
    stress: draft.stress,
    energyScale: draft.energyScale,
    stressScale: draft.stressScale,
    sleepHours: draft.sleepHours.trim() ? Number(draft.sleepHours) : null,
    helped: draft.helped,
    createdAt: checkIn?.createdAt ?? "",
    updatedAt: checkIn?.updatedAt ?? "",
  };
}

function morningDraftCompletion(draft: CheckInDraft, checkIn?: DailyCheckIn) {
  const answers = draftAnswers(draft, checkIn, "morning");
  const raw = morningSleepForDraft(draft, checkIn);
  const empty = morningSleepDefaults();
  const select = (keys: readonly (keyof MorningSleepDraft)[]) =>
    Object.fromEntries(keys.map((key) => [key, raw[key]]));
  const parsed = (keys: readonly (keyof MorningSleepDraft)[]) =>
    parseMorningSleepDraft({ ...empty, ...select(keys) });
  const schedule = parsed(["lightsOut", "gotUp"]);
  const durationFields = [
    "sleepHours",
    "sleepMinutes",
    "extraSleepHours",
    "extraSleepMinutes",
  ] as const;
  const duration = parseMorningSleepDraft({
    ...empty,
    ...select(durationFields),
    // A malformed schedule does not erase otherwise valid duration answers.
    // A valid schedule still enforces the shared time-in-bed constraint.
    ...(schedule.value
      ? {
          lightsOut: schedule.value.lightsOut ?? "",
          gotUp: schedule.value.gotUp ?? "",
        }
      : {}),
  });
  const group = (
    id: MorningCheckInSectionId,
    result: ReturnType<typeof parseMorningSleepDraft>,
  ) =>
    !result.error &&
    getMorningCheckInCompletion(
      { ...answers, morningSleep: result.value, sleepHours: null },
      [id],
    ).complete;

  const defaults = checkInDefaults(checkIn, "morning").morningSleep!;
  // Legacy hours already count as an answered duration. Editing another group
  // must not revoke that answer solely because newer extra-sleep fields exist.
  const unchangedLegacyDuration =
    !checkIn?.morningSleep &&
    durationFields.every((key) => raw[key] === defaults[key]) &&
    getMorningCheckInCompletion(checkIn, ["morning-duration"]).complete;
  const completeBySection: Record<MorningCheckInSectionId, boolean> = {
    notes: getMorningCheckInCompletion(answers, ["notes"]).complete,
    "morning-ratings": group(
      "morning-ratings",
      parsed(MORNING_SLEEP_RATING_FIELDS),
    ),
    "morning-schedule": group("morning-schedule", schedule),
    "morning-interruptions": group(
      "morning-interruptions",
      parsed(["fallAsleepMinutes", "awakenings", "awakeMinutes"]),
    ),
    "morning-duration":
      group("morning-duration", duration) ||
      (unchangedLegacyDuration && !duration.error),
  };
  const sections = getMorningCheckInCompletion().sections.map((section) => ({
    ...section,
    complete: completeBySection[section.id as MorningCheckInSectionId],
  }));
  const missing = sections.filter((section) => !section.complete);
  return {
    sections,
    missing,
    completedCount: sections.length - missing.length,
    totalCount: sections.length,
    complete: missing.length === 0,
  };
}

/** Live optional-section progress, independent of journal-save feedback. */
export function getCheckInCardProgress({
  period,
  checkIn,
  draft,
}: {
  period: DailyCheckInPeriod;
  checkIn?: DailyCheckIn;
  draft?: unknown;
}) {
  const changed = hasCheckInDraftChanges(draft, checkIn, period);
  const completion =
    changed && isCheckInDraft(draft)
      ? period === "morning"
        ? morningDraftCompletion(draft, checkIn)
        : getCheckInCompletion(draftAnswers(draft, checkIn, period))
      : period === "morning"
        ? getMorningCheckInCompletion(checkIn)
        : getCheckInCompletion(checkIn);
  return {
    completion,
    percent:
      completion.totalCount > 0
        ? Math.round((completion.completedCount / completion.totalCount) * 100)
        : 0,
    visible: Boolean(checkIn) || changed,
  };
}

const sectionHints: Record<CheckInSectionId, string> = {
  mood: "Your mood",
  energy: "Energy",
  stress: "Stress",
  sleep: "Sleep hours",
  notes: "Your words",
  helped: "What helped",
  "morning-ratings": "Sleep ratings",
  "morning-schedule": "Sleep times",
  "morning-interruptions": "Night details",
  "morning-duration": "Sleep length",
};

/** Offer a useful next stop without exposing answers or implying a remote save. */
export function getCheckInCardHint(
  period: DailyCheckInPeriod,
  progress: ReturnType<typeof getCheckInCardProgress>,
) {
  if (!progress.visible)
    return period === "morning" ? "How did you sleep?" : "How did today feel?";
  if (progress.completion.complete)
    return period === "morning" ? "Revisit your morning" : "Revisit your day";
  const next = progress.completion.missing[0]?.id;
  return next && sectionHints[next]
    ? `Next · ${sectionHints[next]}`
    : "Choose a section";
}
