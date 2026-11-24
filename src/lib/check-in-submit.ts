import { isCheckInDraft, type CheckInDraft } from "./check-in-draft";

export { sameDraftRevision as checkInSubmissionDraftUnchanged } from "./journal-drafts";

/** Compare submitted fields, leaving editor state and autosave metadata aside. */
function content(draft: CheckInDraft) {
  return JSON.stringify([
    draft.note,
    draft.moods,
    draft.energy,
    draft.stress,
    draft.energyScale ?? 5,
    draft.stressScale ?? 5,
    draft.sleepHours,
    draft.bedtime ?? "",
    draft.helped,
    draft.morningSleep
      ? Object.entries(draft.morningSleep).sort(([a], [b]) =>
          a.localeCompare(b),
        )
      : null,
  ]);
}

/** Read after draining autosave: its acknowledgement may have advanced the base. */
export function prepareCheckInSubmission(
  submitted: CheckInDraft,
  latest: unknown,
  hadDraft: boolean,
): CheckInDraft {
  if (latest === undefined && !hadDraft) return submitted;
  if (!isCheckInDraft(latest) || content(latest) !== content(submitted))
    throw new Error(
      "Your draft changed while saving was starting. Your edits are kept; review them and save again.",
    );
  return {
    ...submitted,
    // Never substitute a freshly fetched server version for an unknown legacy
    // draft base: that would silently authorize overwriting different writing.
    reflectionBaseUpdatedAt: latest.reflectionBaseUpdatedAt,
  };
}
