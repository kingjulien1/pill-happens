import {
  DAILY_MOOD_VALUES,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "./daily-check-in";
import {
  getMorningSleepSummary,
  getMorningSleepValidationError,
  MORNING_SLEEP_RATING_FIELDS,
} from "./morning-sleep";
import { isCheckInRating } from "./check-in-rating";

export const CHECK_IN_SECTIONS = [
  { id: "mood", label: "Mood" },
  { id: "energy", label: "Energy" },
  { id: "stress", label: "Stress" },
  { id: "sleep", label: "Sleep" },
  { id: "notes", label: "Notes" },
  { id: "helped", label: "What Helped" },
] as const;

export const MORNING_CHECK_IN_SECTIONS = [
  { id: "notes", label: "Notes" },
  { id: "morning-ratings", label: "Sleep Ratings" },
  { id: "morning-schedule", label: "Sleep Schedule" },
  { id: "morning-interruptions", label: "Night Interruptions" },
  { id: "morning-duration", label: "Sleep Duration" },
] as const;

export type MorningCheckInSectionId =
  (typeof MORNING_CHECK_IN_SECTIONS)[number]["id"];
export type CheckInSectionId =
  (typeof CHECK_IN_SECTIONS)[number]["id"] | MorningCheckInSectionId;

export const DEFAULT_MORNING_CHECK_IN_SECTIONS = MORNING_CHECK_IN_SECTIONS.map(
  ({ id }) => id,
);

export const DEFAULT_CHECK_IN_SECTIONS = [
  "mood",
  "energy",
  "stress",
  "sleep",
  "notes",
  "helped",
] as const satisfies readonly CheckInSectionId[];

export function isCheckInSection(value: unknown): value is CheckInSectionId {
  return [...CHECK_IN_SECTIONS, ...MORNING_CHECK_IN_SECTIONS].some(
    (section) => section.id === value,
  );
}

/** Only saved responses count; drafts and dialog navigation never mark a section done. */
export function getCheckInCompletion(
  checkIn?: DailyCheckIn,
  trackedIds: readonly CheckInSectionId[] = DEFAULT_CHECK_IN_SECTIONS,
) {
  const completeBySection: Partial<Record<CheckInSectionId, boolean>> = {
    mood:
      Array.isArray(checkIn?.moods) &&
      checkIn.moods.some((mood) => DAILY_MOOD_VALUES.includes(mood)),
    energy:
      checkIn?.energy != null &&
      isCheckInRating(checkIn.energy, checkIn.energyScale),
    stress:
      checkIn?.stress != null &&
      isCheckInRating(checkIn.stress, checkIn.stressScale),
    sleep:
      typeof checkIn?.sleepHours === "number" &&
      Number.isFinite(checkIn.sleepHours) &&
      checkIn.sleepHours >= 0 &&
      checkIn.sleepHours <= 24,
    notes: typeof checkIn?.note === "string" && checkIn.note.trim().length > 0,
    helped:
      typeof checkIn?.helped === "string" && checkIn.helped.trim().length > 0,
  };
  return summarizeCompletion(CHECK_IN_SECTIONS, completeBySection, trackedIds);
}

/** Morning has its own catalog; undefined still means an unanswered Morning. */
export function getMorningCheckInCompletion(
  checkIn?: DailyCheckIn,
  trackedIds: readonly CheckInSectionId[] = DEFAULT_MORNING_CHECK_IN_SECTIONS,
) {
  const sleep = checkIn?.morningSleep;
  const integer = (value: unknown, maximum: number) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maximum;
  const legacyDuration =
    !sleep &&
    typeof checkIn?.sleepHours === "number" &&
    Number.isFinite(checkIn.sleepHours) &&
    checkIn.sleepHours >= 0 &&
    checkIn.sleepHours <= 24;
  const completeBySection: Partial<Record<CheckInSectionId, boolean>> = {
    notes: typeof checkIn?.note === "string" && checkIn.note.trim().length > 0,
    "morning-ratings": Boolean(
      sleep &&
      MORNING_SLEEP_RATING_FIELDS.every(
        (key) => integer(sleep[key], 10) && sleep[key]! >= 1,
      ),
    ),
    "morning-schedule": getMorningSleepSummary(sleep).timeInBedMinutes !== null,
    "morning-interruptions": Boolean(
      sleep &&
      integer(sleep.fallAsleepMinutes, 1_440) &&
      integer(sleep.awakenings, 100) &&
      integer(sleep.awakeMinutes, 1_440),
    ),
    "morning-duration":
      legacyDuration ||
      Boolean(
        sleep &&
        integer(sleep.totalSleepMinutes, 1_440) &&
        integer(sleep.extraSleepMinutes, 1_440) &&
        !getMorningSleepValidationError(sleep),
      ),
  };
  return summarizeCompletion(
    MORNING_CHECK_IN_SECTIONS,
    completeBySection,
    trackedIds,
  );
}

function summarizeCompletion(
  catalog: readonly { readonly id: CheckInSectionId; readonly label: string }[],
  completeBySection: Partial<Record<CheckInSectionId, boolean>>,
  trackedIds: readonly CheckInSectionId[],
) {
  const tracked = new Set(trackedIds);
  // Catalog order remains stable, and duplicate tracked IDs never inflate totals.
  const sections = catalog
    .filter(({ id }) => tracked.has(id))
    .map((section) => ({
      ...section,
      complete: Boolean(completeBySection[section.id]),
    }));
  const missing = sections.filter((section) => !section.complete);
  const totalCount = sections.length;
  const completedCount = totalCount - missing.length;
  return {
    sections,
    missing,
    completedCount,
    totalCount,
    complete: totalCount > 0 && completedCount === totalCount,
  };
}

/** Both periods use identical progress, device-draft and journal-save feedback. */
export function getCheckInCardFeedback({
  period,
  saved,
  completion,
  hasChanges,
  deviceSaved,
}: {
  period: DailyCheckInPeriod;
  saved: boolean;
  completion: ReturnType<typeof getCheckInCompletion>;
  hasChanges: boolean;
  deviceSaved: boolean;
}) {
  const summary = saved
    ? completion.complete
      ? `Check-in saved. All ${completion.totalCount} optional sections are filled.`
      : `Check-in saved. ${completion.completedCount} of ${completion.totalCount} optional sections added. Still to finish: ${completion.missing.map(({ label }) => label).join(", ")}.`
    : "No check-in saved yet. Every section is optional; start with any section.";
  return {
    state: hasChanges ? "draft" : saved ? "saved" : "optional",
    label: hasChanges
      ? deviceSaved
        ? "Draft saved"
        : "Unsent draft"
      : saved
        ? "Saved"
        : "* Optional",
    showSavedMark: hasChanges ? deviceSaved : saved,
    preview: saved
      ? completion.complete
        ? "Your check-in is complete"
        : `${completion.completedCount} of ${completion.totalCount} sections complete · All optional`
      : period === "morning"
        ? "Last night, in focus · All optional"
        : "Start with any section · All optional",
    description: hasChanges
      ? `${summary} ${deviceSaved ? "Unsaved changes are kept on this device." : "Unsaved changes are available for this visit; device storage is unavailable."} Reopen to continue.`
      : summary,
  };
}
