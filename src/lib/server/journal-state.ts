import type { AppData } from "@/lib/domain";
import { withCurrentMedicationDetails } from "@/lib/medication-history";
import {
  applyCompensanIconUpdate,
  needsCompensanIconUpdate,
} from "@/lib/compensan-appearance";
import {
  applyTramalIconUpdate,
  needsTramalIconUpdate,
} from "@/lib/tramal-appearance";
import type { JournalRepository } from "./journal-repository";

type StateRepository = Pick<JournalRepository, "readState" | "mutateState">;

function applyAppearanceUpdates(state: AppData) {
  applyCompensanIconUpdate(state);
  applyTramalIconUpdate(state);
}

/** State and backup reads immediately include edits made before this policy. */
export async function readJournalState(
  repository: StateRepository,
  journalId: string,
): Promise<AppData> {
  const state = await repository.readState(journalId);
  if (needsCompensanIconUpdate(state) || needsTramalIconUpdate(state))
    return withCurrentMedicationDetails(
      await repository.mutateState(journalId, applyAppearanceUpdates),
    );
  return withCurrentMedicationDetails(state);
}

/**
 * Reconcile within the repository's existing atomic write, including every retry.
 * No medication edit can be saved separately from its linked intake updates.
 */
export function mutateJournalState(
  repository: StateRepository,
  journalId: string,
  mutate: (state: AppData) => void,
): Promise<AppData> {
  return repository.mutateState(journalId, (state) => {
    applyAppearanceUpdates(state);
    state.intakes = withCurrentMedicationDetails(state).intakes;
    mutate(state);
    state.intakes = withCurrentMedicationDetails(state).intakes;
  });
}
