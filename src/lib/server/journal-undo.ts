import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { AppData, Goal, Intake, Medication } from "@/lib/domain";
import { isValidDayKey } from "@/lib/domain";
import { getCheckInPeriod, type DailyCheckIn } from "@/lib/daily-check-in";
import { withCurrentMedicationDetails } from "@/lib/medication-history";
import { ApiError } from "./api-error";
import type { JournalRepository } from "./journal-repository";
import { mutateJournalState } from "./journal-state";

export const UNDO_TTL_MS = 15 * 60 * 1_000;
export const UNDO_MAX_TOKEN_LENGTH = 1_500_000;
export const UNDO_BODY_MAX_BYTES = 2_000_000;

const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("intake"), id: z.string().min(1).max(160) }),
  z.object({
    kind: z.literal("intake-replacement"),
    id: z.string().min(1).max(160),
    previousId: z.string().min(1).max(160),
  }),
  z.object({ kind: z.literal("medication"), id: z.string().min(1).max(160) }),
  z.object({ kind: z.literal("goal"), id: z.string().min(1).max(160) }),
  z.object({ kind: z.literal("settings") }),
  z.object({
    kind: z.literal("check-in"),
    day: z.string().refine(isValidDayKey),
    period: z.enum(["morning", "evening"]),
  }),
]);

export type UndoTarget = z.infer<typeof targetSchema>;
/** Resolve against the winning atomic save, including any contention retry. */
export type UndoTargetSource = UndoTarget | ((state: AppData) => UndoTarget);
type UndoRecord = Record<string, unknown> | null;
const recordSchema = z.record(z.string(), z.unknown()).nullable();
const receiptSchema = z.object({
  version: z.literal(1),
  journalId: z.string().min(1).max(160),
  target: targetSchema,
  before: recordSchema,
  after: recordSchema,
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  nonce: z.string().uuid(),
});
type Receipt = z.infer<typeof receiptSchema>;

export type UndoMetadata = {
  token: string;
  expiresAt: string;
  entityId?: string;
};
export type UndoableAppData = AppData & {
  _undo?: UndoMetadata;
  /** Confirm the winning intake save even when no Undo receipt is available. */
  _intakeChange?: { id: string; before?: Intake };
  /** Response-only confirmation from the winning atomic save, never journal data. */
  _unchanged?: true;
};
type StateRepository = Pick<JournalRepository, "readState" | "mutateState">;

function copy<T>(value: T): T {
  // Compare the persisted JSON representation, including omitted legacy fields.
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshot(state: AppData, target: UndoTarget): UndoRecord {
  if (target.kind === "intake-replacement")
    return {
      previous: snapshot(state, { kind: "intake", id: target.previousId }),
      replacement: snapshot(state, { kind: "intake", id: target.id }),
    };
  const value =
    target.kind === "settings"
      ? state.settings
      : target.kind === "check-in"
        ? state.dailyCheckIns?.find(
            (entry) =>
              entry.day === target.day &&
              getCheckInPeriod(entry) === target.period,
          )
        : target.kind === "intake"
          ? state.intakes.find((entry) => entry.id === target.id)
          : target.kind === "medication"
            ? state.medications.find((entry) => entry.id === target.id)
            : state.goals.find((entry) => entry.id === target.id);
  return value ? (copy(value) as UndoRecord) : null;
}

function signature(encoded: string, secret: string): Buffer {
  const key = createHmac("sha256", secret)
    .update("pill-happens:journal-undo:v1")
    .digest();
  return createHmac("sha256", key).update(encoded).digest();
}

function encodeReceipt(
  receipt: Receipt,
  secret: string,
): UndoMetadata | undefined {
  const encoded = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  const token = `${encoded}.${signature(encoded, secret).toString("base64url")}`;
  // A pre-existing oversized legacy record must never turn a committed save
  // into a reported failure just because its optional receipt cannot be sent.
  if (token.length > UNDO_MAX_TOKEN_LENGTH) return undefined;
  return {
    token,
    expiresAt: new Date(receipt.expiresAt).toISOString(),
    ...("id" in receipt.target ? { entityId: receipt.target.id } : {}),
  };
}

function readReceipt(
  token: string,
  journalId: string,
  secret: string,
  now: number,
): Receipt {
  const invalid = () => new ApiError(400, "This undo request is not valid.");
  if (
    secret.length < 32 ||
    token.length > UNDO_MAX_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
  )
    throw invalid();
  const [encoded, suppliedText] = token.split(".");
  const supplied = Buffer.from(suppliedText, "base64url");
  const expected = signature(encoded, secret);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw invalid();
  let receipt: Receipt;
  try {
    receipt = receiptSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
  } catch {
    throw invalid();
  }
  if (receipt.journalId !== journalId)
    throw new ApiError(403, "This undo belongs to a different journal.");
  if (
    receipt.issuedAt > now ||
    receipt.expiresAt <= now ||
    receipt.expiresAt - receipt.issuedAt !== UNDO_TTL_MS
  )
    throw new ApiError(
      410,
      "Undo has expired. You can still edit the saved record.",
    );
  return receipt;
}

/** Capture both versions within the same successful CAS callback, never a client snapshot. */
export async function mutateJournalStateWithUndo(
  repository: StateRepository,
  journalId: string,
  targetSource: UndoTargetSource,
  mutate: (state: AppData) => void,
  secret: string,
  now = Date.now(),
): Promise<UndoableAppData> {
  let change:
    { target: UndoTarget; before: UndoRecord; after: UndoRecord } | undefined;
  let data: UndoableAppData = await mutateJournalState(
    repository,
    journalId,
    (state) => {
      const target =
        typeof targetSource === "function" ? targetSource(state) : targetSource;
      const before = snapshot(state, target);
      mutate(state);
      // Include the same derived medication details that the repository will save.
      state.intakes = withCurrentMedicationDetails(state).intakes;
      change = { target, before, after: snapshot(state, target) };
    },
  );
  if (!change) return data;
  const { target } = change;
  if (target.kind === "intake" || target.kind === "intake-replacement") {
    const before =
      target.kind === "intake" ? change.before : change.before?.previous;
    const after =
      target.kind === "intake" ? change.after : change.after?.replacement;
    if (after)
      data = {
        ...data,
        _intakeChange: {
          id: target.id,
          ...(before ? { before: copy(before) as unknown as Intake } : {}),
        },
      };
  }
  // A check-in's version may advance on Save even when every answer is equal.
  // Compare complete records (including private writing), not display snapshots.
  const content = (record: UndoRecord) => {
    if (!record) return record;
    if (target.kind === "intake")
      return {
        ...record,
        takenAt: Date.parse(String(record.takenAt)),
        route: record.route ?? "unspecified",
      };
    if (target.kind !== "check-in") return record;
    const { updatedAt: _version, ...fields } = record;
    void _version;
    return fields;
  };
  if (isDeepStrictEqual(content(change.before), content(change.after)))
    return { ...data, _unchanged: true };
  if (secret.length < 32) return data;
  const undo = encodeReceipt(
    {
      version: 1,
      journalId,
      ...change,
      issuedAt: now,
      expiresAt: now + UNDO_TTL_MS,
      nonce: randomUUID(),
    },
    secret,
  );
  return undo ? { ...data, _undo: undo } : data;
}

function replaceRecord<T>(
  entries: T[],
  matches: (entry: T) => boolean,
  before: T | null,
): T[] {
  const index = entries.findIndex(matches);
  if (before === null) return entries.filter((entry) => !matches(entry));
  if (index < 0) return [...entries, before];
  return entries.map((entry, position) =>
    position === index ? before : entry,
  );
}

function restoreRecord(state: AppData, target: UndoTarget, before: UndoRecord) {
  const conflict = (message: string) => {
    throw new ApiError(409, message);
  };
  if (target.kind === "intake-replacement") {
    // Both records were compared before this point. Restore the pair together,
    // never deleting a replacement first and attempting a second write later.
    restoreRecord(
      state,
      { kind: "intake", id: target.id },
      (before?.replacement ?? null) as UndoRecord,
    );
    restoreRecord(
      state,
      { kind: "intake", id: target.previousId },
      (before?.previous ?? null) as UndoRecord,
    );
    return;
  }
  if (target.kind === "settings") {
    if (!before) conflict("The earlier settings are no longer available.");
    state.settings = copy(before) as AppData["settings"];
    return;
  }
  if (target.kind === "medication") {
    if (
      !before &&
      (state.intakes.some((entry) => entry.medicationId === target.id) ||
        state.goals.some((entry) => entry.medicationId === target.id))
    )
      conflict(
        "This medication now has linked records. Archive it instead of undoing its creation.",
      );
    const rest = state.medications.filter((entry) => entry.id !== target.id);
    if (before && rest.length >= 1_000)
      conflict(
        "Your medication list is full. This medication cannot be restored yet.",
      );
    state.medications = replaceRecord(
      state.medications,
      (entry) => entry.id === target.id,
      before ? (copy(before) as unknown as Medication) : null,
    );
    return;
  }
  if (target.kind === "intake" || target.kind === "goal") {
    if (
      before &&
      !state.medications.some((entry) => entry.id === before.medicationId)
    )
      conflict(
        "The linked medication is no longer available. This record cannot be restored.",
      );
    if (target.kind === "intake") {
      const rest = state.intakes.filter((entry) => entry.id !== target.id);
      if (before && rest.length >= 200_000)
        conflict("Your intake log is full. This entry cannot be restored yet.");
      state.intakes = replaceRecord(
        state.intakes,
        (entry) => entry.id === target.id,
        before ? (copy(before) as unknown as Intake) : null,
      );
    } else {
      const rest = state.goals.filter((entry) => entry.id !== target.id);
      if (before && rest.length >= 10_000)
        conflict("Your goal list is full. This goal cannot be restored yet.");
      state.goals = replaceRecord(
        state.goals,
        (entry) => entry.id === target.id,
        before ? (copy(before) as unknown as Goal) : null,
      );
    }
    return;
  }
  const rest = (state.dailyCheckIns ?? []).filter(
    (entry) =>
      entry.day !== target.day || getCheckInPeriod(entry) !== target.period,
  );
  if (before && rest.length >= 50_000)
    conflict(
      "Your check-in log is full. This check-in cannot be restored yet.",
    );
  state.dailyCheckIns = replaceRecord(
    state.dailyCheckIns ?? [],
    (entry) =>
      entry.day === target.day && getCheckInPeriod(entry) === target.period,
    before ? (copy(before) as unknown as DailyCheckIn) : null,
  );
}

/** Compare and invert one record (or replacement pair), preserving unrelated edits. */
export async function undoJournalMutation(
  repository: StateRepository,
  journalId: string,
  token: string,
  secret: string,
  now = Date.now(),
): Promise<AppData> {
  const receipt = readReceipt(token, journalId, secret, now);
  return mutateJournalState(repository, journalId, (state) => {
    const current = snapshot(state, receipt.target);
    if (isDeepStrictEqual(current, receipt.before)) return;
    if (!isDeepStrictEqual(current, receipt.after))
      throw new ApiError(
        409,
        "This record changed after that save. Review the latest version instead of undoing it.",
      );
    restoreRecord(state, receipt.target, receipt.before);
  });
}
