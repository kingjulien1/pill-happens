import { needsGettingStarted } from "@/lib/guide-onboarding";
import type { JournalRepository } from "./journal-repository";

type GuideRepository = Pick<JournalRepository, "readState" | "mutateState">;

/** A read or route prefetch never consumes the first guide visit. */
export async function journalNeedsGettingStarted(
  repository: GuideRepository,
  journalId: string,
): Promise<boolean> {
  return needsGettingStarted(await repository.readState(journalId));
}

/**
 * Called only by an authenticated mutation after the guide actually mounts.
 * Recheck inside the existing atomic retry so a concurrent intake is preserved.
 */
export async function acknowledgeGettingStarted(
  repository: GuideRepository,
  journalId: string,
): Promise<void> {
  if (!(await journalNeedsGettingStarted(repository, journalId))) return;
  await repository.mutateState(journalId, (state) => {
    if (needsGettingStarted(state))
      state.onboarding = { ...state.onboarding, guidePending: false };
  });
}
