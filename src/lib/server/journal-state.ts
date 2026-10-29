import type { AppData } from "@/lib/domain";
import { withCurrentMedicationDetails } from "@/lib/medication-history";
import type { JournalRepository } from "./journal-repository";

type StateRepository = Pick<JournalRepository, "readState" | "mutateState">;

/** State and backup reads immediately include edits made before this policy. */
export async function readJournalState(
  repository: StateRepository,
  journalId: string,
): Promise<AppData> {
  return withCurrentMedicationDetails(await repository.readState(journalId));
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
    state.intakes = withCurrentMedicationDetails(state).intakes;
    mutate(state);
    state.intakes = withCurrentMedicationDetails(state).intakes;
  });
}
