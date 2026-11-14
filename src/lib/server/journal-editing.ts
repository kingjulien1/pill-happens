import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { dayKey, isValidDayKey, type AppData } from "@/lib/domain";
import { getCheckInPeriod, type DailyCheckIn } from "@/lib/daily-check-in";
import type {
  JournalEditingReport,
  JournalEditingRevision,
} from "@/lib/journal-editing";
import {
  createJournalReferenceAliases,
  findTypedJournalReferences,
} from "@/lib/journal-reference-markdown";
import {
  journalCalendarHref,
  parseJournalCalendarReference,
} from "@/lib/journal-mentions";
import type {
  JournalEnhancementContent,
  JournalEnhancementInput,
  JournalEnhancementReference,
} from "@/lib/journal-enhancement";
import {
  JournalEnhancementValidationError,
  validateJournalEnhancement,
  type JournalEnhancementCandidate,
} from "@/lib/journal-enhancement";
import { formatJournalEntryHeading } from "@/lib/journal-entry-template";
import type { JournalRepository } from "./journal-repository";
import { isJournalId } from "./security";

export const JOURNAL_EDITING_POLICY = "journal-polish-v1";
export const JOURNAL_EDITING_LEASE_MS = 10 * 60_000;
export const JOURNAL_EDITING_BUDGET_MS = 240_000;
export const JOURNAL_EDITING_BATCH_SIZE = 8;
type Repository = Pick<JournalRepository, "readState" | "mutateState">;
type Generator = (
  input: JournalEnhancementInput,
) => Promise<JournalEnhancementContent>;

export function journalNoteHash(note: string) {
  return createHash("sha256").update(note).digest("hex");
}

/** Cron is deliberately independent of browser sessions and fails closed. */
export function journalEditingAuthorized(
  authorization: string | null,
  secret?: string,
) {
  if (!secret || secret.length < 32 || !authorization) return false;
  const supplied = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Existing app destinations only; relative dates are anchored to the written day. */
export function journalEditingContext(
  state: AppData,
  entry: DailyCheckIn,
): JournalEnhancementInput {
  const aliases = createJournalReferenceAliases(state);
  const references: JournalEnhancementReference[] = [];
  for (const [label, destinations] of aliases) {
    if (destinations.size !== 1) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapePattern(label)}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of entry.note.matchAll(pattern))
      references.push({ label: match[0], href: [...destinations][0] });
  }
  for (const reference of findTypedJournalReferences(
    entry.note,
    aliases,
    entry.day,
    entry.day,
  ))
    references.push({ label: reference.label, href: reference.href });
  const calendar =
    /(?<![\p{L}\p{N}])(?:today|yesterday|day before yesterday|two days ago|this week|last week|\d{4}-\d{2}-\d{2}|\d{4}-?w\d{1,2}|\d{1,2}[./]\d{1,2}[./]\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)(?![\p{L}\p{N}])/giu;
  for (const match of entry.note.matchAll(calendar)) {
    const reference = parseJournalCalendarReference(
      match[0],
      entry.day,
      entry.day,
    );
    if (reference)
      references.push({
        label: match[0],
        href: journalCalendarHref(reference),
      });
  }
  return {
    note: entry.note,
    day: entry.day,
    timezone: state.settings.timezone,
    medications: state.medications
      .filter((medication) =>
        [medication.name, medication.activeIngredient ?? ""].some(
          (label) =>
            label.trim() &&
            new RegExp(
              `(?<![\\p{L}\\p{N}])${escapePattern(label)}(?![\\p{L}\\p{N}])`,
              "iu",
            ).test(entry.note),
        ),
      )
      .map(({ id, name, activeIngredient }) => ({
        id,
        name,
        activeIngredient,
      })),
    allowedReferences: references,
  };
}

function alreadyReviewed(state: AppData, entry: DailyCheckIn) {
  const hash = journalNoteHash(entry.note);
  return (
    state.journalEditing?.revisions.some(
      (revision) =>
        revision.policy === JOURNAL_EDITING_POLICY &&
        revision.day === entry.day &&
        revision.period === getCheckInPeriod(entry) &&
        (revision.restoredAt
          ? revision.sourceHash === hash
          : revision.outputHash === hash),
    ) ?? false
  );
}

/** Full local catalog guards facts without sending unrelated medication names. */
function validateResult(
  state: AppData,
  entry: DailyCheckIn,
  result: JournalEnhancementContent,
) {
  const prefix = `${formatJournalEntryHeading(entry.day)} ${result.summary}\n\n`;
  if (
    typeof result.markdown !== "string" ||
    !result.markdown.startsWith(prefix)
  )
    throw new JournalEnhancementValidationError("structure");
  return validateJournalEnhancement(
    { ...journalEditingContext(state, entry), medications: state.medications },
    {
      body: result.markdown.slice(prefix.length),
      summary: result.summary,
    },
  );
}

function candidates(state: AppData, now: Date, includeDeferred = false) {
  const today = dayKey(now, state.settings.timezone);
  return (state.dailyCheckIns ?? [])
    .filter(
      (entry) =>
        isValidDayKey(entry.day) &&
        entry.day < today &&
        entry.note.replace(/^# [^\n]*--[^\n]*\n?/u, "").trim().length > 0 &&
        !alreadyReviewed(state, entry) &&
        (includeDeferred ||
          !state.journalEditing?.failures?.some(
            (failure) =>
              failure.day === entry.day &&
              failure.period === getCheckInPeriod(entry) &&
              failure.sourceHash === journalNoteHash(entry.note) &&
              Date.parse(failure.retryAfter) > now.getTime(),
          )),
    )
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        getCheckInPeriod(a).localeCompare(getCheckInPeriod(b)),
    );
}

class EditingBusy extends Error {}
class EntryChanged extends Error {}

export class JournalEditingConflict extends Error {}

/** A lease prevents overlapping paid requests; the note CAS prevents stale edits. */
export async function runJournalEditing({
  repository,
  journalId,
  generate,
  now = () => new Date(),
  limit = JOURNAL_EDITING_BATCH_SIZE,
}: {
  repository: Repository;
  journalId: string;
  generate: Generator;
  now?: () => Date;
  limit?: number;
}): Promise<JournalEditingReport> {
  if (
    !isJournalId(journalId) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  )
    throw new Error("Invalid journal editing scope.");
  const report: JournalEditingReport = {
    reviewed: 0,
    changed: 0,
    skipped: 0,
    failed: 0,
    remaining: 0,
    busy: false,
  };
  const started = now().getTime();
  const leaseId = randomUUID();
  let initial: AppData;
  try {
    initial = await repository.mutateState(journalId, (state) => {
      const lease = state.journalEditing?.lease;
      if (lease && Date.parse(lease.expiresAt) > now().getTime())
        throw new EditingBusy();
      state.journalEditing ??= { revisions: [] };
      state.journalEditing.lease = {
        id: leaseId,
        expiresAt: new Date(
          now().getTime() + JOURNAL_EDITING_LEASE_MS,
        ).toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof EditingBusy) return { ...report, busy: true };
    throw error;
  }
  try {
    for (const entry of candidates(initial, now()).slice(0, limit)) {
      // Leave room for the provider's45s timeout and a final atomic write.
      if (now().getTime() - started > JOURNAL_EDITING_BUDGET_MS - 60_000) break;
      const current = await repository.readState(journalId);
      const latest = current.dailyCheckIns?.find(
        (value) =>
          value.day === entry.day &&
          getCheckInPeriod(value) === getCheckInPeriod(entry),
      );
      if (
        !latest ||
        latest.note !== entry.note ||
        latest.updatedAt !== entry.updatedAt ||
        alreadyReviewed(current, latest)
      ) {
        report.skipped++;
        continue;
      }
      try {
        const context = journalEditingContext(current, latest);
        const contextHash = journalNoteHash(JSON.stringify(context));
        const result = validateResult(current, latest, await generate(context));
        const revisionId = randomUUID();
        const reviewedAt = now().toISOString();
        const timestamp = new Date(
          Math.max(now().getTime(), Date.parse(latest.updatedAt) + 1),
        ).toISOString();
        await repository.mutateState(journalId, (state) => {
          if (state.journalEditing?.lease?.id !== leaseId)
            throw new EntryChanged();
          const target = state.dailyCheckIns?.find(
            (value) =>
              value.day === entry.day &&
              getCheckInPeriod(value) === getCheckInPeriod(entry),
          );
          if (
            !target ||
            target.note !== latest.note ||
            target.updatedAt !== latest.updatedAt ||
            state.settings.timezone !== current.settings.timezone ||
            journalNoteHash(
              JSON.stringify(journalEditingContext(state, target)),
            ) !== contextHash ||
            alreadyReviewed(state, target)
          )
            throw new EntryChanged();
          validateResult(state, target, result);
          const changed = target.note !== result.markdown;
          const revision: JournalEditingRevision = {
            id: revisionId,
            day: target.day,
            period: getCheckInPeriod(target),
            policy: JOURNAL_EDITING_POLICY,
            sourceHash: journalNoteHash(target.note),
            outputHash: journalNoteHash(result.markdown),
            originalNote: target.note,
            editedNote: result.markdown,
            sourceUpdatedAt: target.updatedAt,
            appliedUpdatedAt: changed ? timestamp : target.updatedAt,
            reviewedAt,
          };
          state.journalEditing!.revisions.push(revision);
          state.journalEditing!.failures =
            state.journalEditing!.failures?.filter(
              (failure) =>
                failure.day !== target.day ||
                failure.period !== getCheckInPeriod(target),
            );
          if (changed) {
            target.note = result.markdown;
            target.updatedAt = timestamp;
          }
        });
        report.reviewed++;
        if (result.markdown !== latest.note) report.changed++;
      } catch (error) {
        if (error instanceof EntryChanged) report.skipped++;
        else {
          report.failed++;
          await repository.mutateState(journalId, (state) => {
            if (state.journalEditing?.lease?.id !== leaseId) return;
            const target = state.dailyCheckIns?.find(
              (value) =>
                value.day === entry.day &&
                getCheckInPeriod(value) === getCheckInPeriod(entry),
            );
            if (
              !target ||
              target.note !== latest.note ||
              target.updatedAt !== latest.updatedAt
            )
              return;
            const sourceHash = journalNoteHash(latest.note);
            const previous = state.journalEditing.failures?.find(
              (failure) =>
                failure.day === entry.day &&
                failure.period === getCheckInPeriod(entry) &&
                failure.sourceHash === sourceHash,
            );
            const attempts = (previous?.attempts ?? 0) + 1;
            const delay = Math.min(
              7 * 24 * 60 * 60_000,
              48 * 60 * 60_000 * 2 ** Math.min(attempts - 1, 3),
            );
            state.journalEditing.failures = [
              ...(state.journalEditing.failures ?? []).filter(
                (failure) =>
                  failure.day !== entry.day ||
                  failure.period !== getCheckInPeriod(entry),
              ),
              {
                day: entry.day,
                period: getCheckInPeriod(entry),
                sourceHash,
                attempts,
                retryAfter: new Date(now().getTime() + delay).toISOString(),
              },
            ];
          });
        }
        // No raw source, model output, credentials or error bodies enter logs.
      }
    }
    report.remaining = candidates(
      await repository.readState(journalId),
      now(),
      true,
    ).length;
    return report;
  } finally {
    await repository.mutateState(journalId, (state) => {
      if (state.journalEditing?.lease?.id !== leaseId) return;
      delete state.journalEditing.lease;
      state.journalEditing.lastRun = {
        ...report,
        finishedAt: now().toISOString(),
      };
    });
  }
}

/** Restoration changes only this note and rejects an intervening manual edit. */
export function restoreJournalEditingRevision(
  state: AppData,
  revisionId: string,
  now: Date,
) {
  const revision = state.journalEditing?.revisions.find(
    (value) => value.id === revisionId,
  );
  if (!revision || revision.restoredAt)
    throw new JournalEditingConflict(
      "This original is not available to restore.",
    );
  const entry = state.dailyCheckIns?.find(
    (value) =>
      value.day === revision.day && getCheckInPeriod(value) === revision.period,
  );
  if (!entry || journalNoteHash(entry.note) !== revision.outputHash)
    throw new JournalEditingConflict(
      "This journal has changed since the edit. Its current writing was kept.",
    );
  entry.note = revision.originalNote;
  entry.updatedAt = new Date(
    Math.max(now.getTime(), Date.parse(entry.updatedAt) + 1),
  ).toISOString();
  revision.restoredAt = now.toISOString();
}

/** The initial human editing pass gets the same validation and durable originals. */
export function saveReviewedJournalEntry(
  state: AppData,
  input: {
    day: string;
    period: "morning" | "evening";
    expectedHash: string;
    expectedUpdatedAt: string;
    candidate: JournalEnhancementCandidate;
  },
  now: Date,
) {
  const entry = state.dailyCheckIns?.find(
    (value) =>
      value.day === input.day && getCheckInPeriod(value) === input.period,
  );
  if (!entry)
    throw new JournalEditingConflict(
      "This journal entry is no longer available.",
    );
  const prior = state.journalEditing?.revisions.find(
    (revision) =>
      revision.day === input.day &&
      revision.period === input.period &&
      revision.sourceHash === input.expectedHash &&
      revision.sourceUpdatedAt === input.expectedUpdatedAt &&
      revision.outputHash === journalNoteHash(entry.note) &&
      !revision.restoredAt,
  );
  if (prior) return;
  if (
    entry.updatedAt !== input.expectedUpdatedAt ||
    journalNoteHash(entry.note) !== input.expectedHash
  )
    throw new JournalEditingConflict(
      "This entry changed while it was being edited. Its current writing was kept.",
    );
  const result = validateJournalEnhancement(
    { ...journalEditingContext(state, entry), medications: state.medications },
    input.candidate,
  );
  const changed = entry.note !== result.markdown;
  const timestamp = new Date(
    Math.max(now.getTime(), Date.parse(entry.updatedAt) + 1),
  ).toISOString();
  const revision: JournalEditingRevision = {
    id: randomUUID(),
    day: entry.day,
    period: input.period,
    policy: JOURNAL_EDITING_POLICY,
    sourceHash: input.expectedHash,
    outputHash: journalNoteHash(result.markdown),
    originalNote: entry.note,
    editedNote: result.markdown,
    sourceUpdatedAt: entry.updatedAt,
    appliedUpdatedAt: changed ? timestamp : entry.updatedAt,
    reviewedAt: now.toISOString(),
  };
  state.journalEditing ??= { revisions: [] };
  state.journalEditing.revisions.push(revision);
  state.journalEditing.failures = state.journalEditing.failures?.filter(
    (failure) =>
      failure.day !== entry.day || failure.period !== getCheckInPeriod(entry),
  );
  if (changed) {
    entry.note = result.markdown;
    entry.updatedAt = timestamp;
  }
}
