import "server-only";

import type { AppData } from "@/lib/domain";
import { authenticatedJournal } from "./auth";
import { journalRepository } from "./database";
import { mutateJournalState, readJournalState } from "./journal-state";
import {
  mutateJournalStateWithUndo,
  undoJournalMutation,
  type UndoTargetSource,
  type UndoableAppData,
} from "./journal-undo";

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

/** Optional response metadata is never part of the persisted journal document. */
export async function mutateStateWithUndo(
  target: UndoTargetSource,
  mutate: (state: AppData) => void,
): Promise<UndoableAppData> {
  return mutateJournalStateWithUndo(
    journalRepository(),
    await requireJournal(),
    target,
    mutate,
    process.env.SESSION_SECRET ?? "",
  );
}

export async function undoState(token: string): Promise<AppData> {
  return undoJournalMutation(
    journalRepository(),
    await requireJournal(),
    token,
    process.env.SESSION_SECRET ?? "",
  );
}

export async function consumeLoginAttempt(): Promise<boolean> {
  return journalRepository().consumeAuthAttempt("signin");
}

/** Successful creation never resets this separate global creation quota. */
export async function consumeCreationAttempt(): Promise<boolean> {
  return journalRepository().consumeAuthAttempt("creation");
}
