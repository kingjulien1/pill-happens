import "server-only";

import type { AppData } from "@/lib/domain";
import { authenticatedJournal } from "./auth";
import { journalRepository } from "./database";
import { mutateJournalState, readJournalState } from "./journal-state";

async function requireJournal(): Promise<string> {
  const journalId = await authenticatedJournal();
  if (!journalId) throw new Error("A signed-in journal is required.");
  return journalId;
}

export async function readState(): Promise<AppData> {
  return readJournalState(journalRepository(), await requireJournal());
}

/** The mutation may run more than once on contention; keep side effects outside it. */
export async function mutateState(
  mutate: (state: AppData) => void,
): Promise<AppData> {
  return mutateJournalState(
    journalRepository(),
    await requireJournal(),
    mutate,
  );
}

export async function consumeLoginAttempt(): Promise<boolean> {
  return journalRepository().consumeAuthAttempt("signin");
}

/** Successful creation never resets this separate global creation quota. */
export async function consumeCreationAttempt(): Promise<boolean> {
  return journalRepository().consumeAuthAttempt("creation");
}
