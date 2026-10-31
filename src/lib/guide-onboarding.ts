import { emptyData, type AppData } from "@/lib/domain";

/** Existing journals do not acquire a new first-visit requirement. */
export function needsGettingStarted(
  state: Pick<AppData, "onboarding">,
): boolean {
  return state.onboarding?.guidePending === true;
}

/** Only credential-backed journal creation uses this first-visit state. */
export function newJournalData(): AppData {
  return { ...emptyData(), onboarding: { guidePending: true } };
}
