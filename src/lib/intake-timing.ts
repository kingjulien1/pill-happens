import { toLocalInput } from "./domain";
import { isIntakeFormDraft, type IntakeFormDraft } from "./intake-form-draft";

export const INTAKE_TIMING_KEY = "intake:timing";
export type IntakeTiming = Pick<
  IntakeFormDraft,
  "takenAt" | "timezone" | "initialTimestamp"
>;
export type IntakeTimingPreference =
  { mode: "automatic" } | ({ mode: "pinned" } & IntakeTiming);

export function isIntakeTimingPreference(
  value: unknown,
): value is IntakeTimingPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const timing = value as Record<string, unknown>;
  return (
    timing.mode === "automatic" ||
    (timing.mode === "pinned" &&
      isIntakeFormDraft({ ...timing, medicationId: "", quantity: "" }))
  );
}

export function pinnedIntakeTiming(
  draft: IntakeTiming,
): IntakeTimingPreference {
  return {
    mode: "pinned",
    takenAt: draft.takenAt,
    timezone: draft.timezone,
    initialTimestamp: draft.initialTimestamp,
  };
}

/** Old per-entry drafts can opt into the shared pin once, without altering an instant. */
export function hasEditedIntakeTiming(draft: IntakeTiming) {
  return draft.takenAt !== toLocalInput(draft.initialTimestamp, draft.timezone);
}

/** An explicit unpin supersedes manual timing left in older per-entry drafts. */
export function originalIntakeTiming(
  draft: IntakeFormDraft,
  savedTimestamp = draft.initialTimestamp,
): IntakeFormDraft {
  return {
    ...draft,
    initialTimestamp: savedTimestamp,
    takenAt: toLocalInput(savedTimestamp, draft.timezone),
  };
}

/** Only timing is shared; medication, route and amount remain owned by each draft. */
export function withIntakeTiming(
  draft: IntakeFormDraft,
  preference: IntakeTimingPreference,
  timezone: string,
  now: Date,
  followClock: boolean,
): IntakeFormDraft {
  if (preference.mode === "pinned") {
    return {
      ...draft,
      takenAt: preference.takenAt,
      timezone: preference.timezone,
      initialTimestamp: preference.initialTimestamp,
    };
  }
  if (!followClock) return draft;
  return {
    ...draft,
    initialTimestamp: now.toISOString(),
    takenAt: toLocalInput(now, timezone),
    timezone,
  };
}
