import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { isValidDayKey, type AppData } from "@/lib/domain";
import {
  DAILY_CHECK_IN_PERIODS,
  DAILY_REFLECTION_MAX_LENGTH,
  checkInForDay,
} from "@/lib/daily-check-in";
import {
  parseReflectionInsightResponse,
  reflectionInsightEligible,
  type ReflectionInsightCacheEntry,
  type ReflectionInsightReady,
  type ReflectionInsightRequest,
  type ReflectionInsightResponse,
} from "@/lib/reflection-insights";
import type { JournalRepository } from "./journal-repository";

export const REFLECTION_INSIGHT_LEASE_MS = 45_000;
export const REFLECTION_INSIGHT_RETRY_MS = 60_000;
export const REFLECTION_INSIGHT_VERSIONS = 4;

export const reflectionInsightRequestSchema = z.object({
  day: z.string().refine(isValidDayKey, "Choose a valid tracking day."),
  period: z.enum(DAILY_CHECK_IN_PERIODS),
  note: z.string().max(DAILY_REFLECTION_MAX_LENGTH),
  retry: z.boolean().optional(),
});

type InsightRepository = Pick<JournalRepository, "readState" | "mutateState">;
export type ReflectionInsightContent = Pick<
  ReflectionInsightReady,
  "summary" | "advice"
>;
type InsightOptions = {
  configured: boolean;
  generate: (
    note: string,
    period: ReflectionInsightRequest["period"],
  ) => Promise<ReflectionInsightContent>;
  now?: () => number;
  token?: () => string;
};

/** A thrown read result aborts the repository CAS before it performs any write. */
class InsightReadResult extends Error {
  constructor(public result: ReflectionInsightResponse) {
    super("Reflection insight needs no state write.");
  }
}

export function reflectionNoteHash(note: string): string {
  // JSON preserves lone UTF-16 surrogates too; plain UTF-8 encoding would map
  // distinct malformed source strings to the same replacement character.
  return createHash("sha256")
    .update(JSON.stringify(note), "utf8")
    .digest("hex");
}

function sourceMatches(
  state: AppData,
  input: ReflectionInsightRequest,
): boolean {
  return (
    checkInForDay(state.dailyCheckIns, input.day, input.period)?.note ===
    input.note
  );
}

function sameIdentity(
  entry: ReflectionInsightCacheEntry,
  input: Pick<ReflectionInsightRequest, "day" | "period">,
  noteHash: string,
): boolean {
  return (
    entry.day === input.day &&
    entry.period === input.period &&
    entry.noteHash === noteHash
  );
}

function cachedResult(
  entry: ReflectionInsightCacheEntry | undefined,
  now: number,
  retry = false,
): ReflectionInsightResponse | null {
  if (!entry) return null;
  if (entry.status === "ready") return parseReflectionInsightResponse(entry);
  if (entry.status === "pending" && Date.parse(entry.leaseUntil) > now)
    return {
      status: "pending",
      noteHash: entry.noteHash,
      retryAfterMs: Math.max(
        1000,
        Math.min(5000, Date.parse(entry.leaseUntil) - now),
      ),
    };
  if (entry.status === "failed" && (!retry || Date.parse(entry.retryAt) > now))
    return {
      status: "unavailable",
      reason: "failed",
      retryAfterMs: Math.max(0, Date.parse(entry.retryAt) - now),
    };
  return null;
}

function entryTime(entry: ReflectionInsightCacheEntry): number {
  return Date.parse(
    entry.status === "ready"
      ? entry.generatedAt
      : entry.status === "pending"
        ? entry.startedAt
        : entry.failedAt,
  );
}

/** Keep four versions per check-in, protecting its current text and live owners. */
function putCache(
  state: AppData,
  next: ReflectionInsightCacheEntry,
  now: number,
) {
  const entries = (state.reflectionInsights ?? []).filter(
    (entry) => !sameIdentity(entry, next, next.noteHash),
  );
  const siblings = entries
    .filter((entry) => entry.day === next.day && entry.period === next.period)
    .sort((a, b) => entryTime(b) - entryTime(a));
  const currentNote = checkInForDay(
    state.dailyCheckIns,
    next.day,
    next.period,
  )?.note;
  const currentHash =
    currentNote === undefined ? null : reflectionNoteHash(currentNote);
  const kept = new Set<ReflectionInsightCacheEntry>();
  // An in-flight owner keeps its lease even during rapid edits between versions.
  for (const entry of siblings)
    if (
      entry.noteHash === currentHash ||
      (entry.status === "pending" && Date.parse(entry.leaseUntil) > now)
    )
      kept.add(entry);
  for (const entry of siblings) {
    if (kept.size >= REFLECTION_INSIGHT_VERSIONS - 1) break;
    kept.add(entry);
  }
  state.reflectionInsights = [
    ...entries.filter(
      (entry) =>
        entry.day !== next.day ||
        entry.period !== next.period ||
        kept.has(entry),
    ),
    next,
  ];
}

/**
 * Claim and completion are separate atomic writes. Transport side effects never
 * run inside retryable CAS callbacks, and source check-in timestamps stay intact.
 */
export async function getReflectionInsight(
  repository: InsightRepository,
  journalId: string,
  input: ReflectionInsightRequest,
  options: InsightOptions,
): Promise<ReflectionInsightResponse> {
  if (!reflectionInsightEligible(input.note))
    return { status: "unavailable", reason: "too_short" };
  const state = await repository.readState(journalId);
  if (!sourceMatches(state, input))
    return { status: "unavailable", reason: "save_first" };
  const noteHash = reflectionNoteHash(input.note);
  const clock = options.now ?? Date.now;
  const existing = state.reflectionInsights?.find((entry) =>
    sameIdentity(entry, input, noteHash),
  );
  const cached = cachedResult(existing, clock(), input.retry);
  if (cached) return cached;
  if (!options.configured)
    return { status: "unavailable", reason: "not_configured" };

  const token = (options.token ?? randomUUID)();
  const startedAt = clock();
  try {
    await repository.mutateState(journalId, (current) => {
      if (!sourceMatches(current, input))
        throw new InsightReadResult({
          status: "unavailable",
          reason: "changed",
        });
      const latest = current.reflectionInsights?.find((entry) =>
        sameIdentity(entry, input, noteHash),
      );
      const result = cachedResult(latest, clock(), input.retry);
      if (result) throw new InsightReadResult(result);
      putCache(
        current,
        {
          day: input.day,
          period: input.period,
          noteHash,
          status: "pending",
          token,
          startedAt: new Date(startedAt).toISOString(),
          leaseUntil: new Date(
            startedAt + REFLECTION_INSIGHT_LEASE_MS,
          ).toISOString(),
        },
        startedAt,
      );
    });
  } catch (error) {
    if (error instanceof InsightReadResult) return error.result;
    throw error;
  }

  let ready: ReflectionInsightReady | null = null;
  try {
    const content = await options.generate(input.note, input.period);
    const candidate = parseReflectionInsightResponse({
      ...content,
      status: "ready",
      noteHash,
      generatedAt: new Date(clock()).toISOString(),
    });
    if (candidate?.status !== "ready")
      throw new Error("Invalid reflection insight.");
    ready = candidate;
  } catch {
    // A failure is persistent and only an explicit retry can start another call.
    ready = null;
  }

  const finishedAt = clock();
  try {
    await repository.mutateState(journalId, (current) => {
      const lease = current.reflectionInsights?.find((entry) =>
        sameIdentity(entry, input, noteHash),
      );
      if (lease?.status !== "pending" || lease.token !== token) {
        if (!sourceMatches(current, input))
          throw new InsightReadResult({
            status: "unavailable",
            reason: "changed",
          });
        throw new InsightReadResult(
          cachedResult(lease, finishedAt) ?? {
            status: "unavailable",
            reason: "changed",
          },
        );
      }
      putCache(
        current,
        ready
          ? {
              day: input.day,
              period: input.period,
              ...ready,
            }
          : {
              day: input.day,
              period: input.period,
              noteHash,
              status: "failed",
              failedAt: new Date(finishedAt).toISOString(),
              retryAt: new Date(
                finishedAt + REFLECTION_INSIGHT_RETRY_MS,
              ).toISOString(),
            },
        finishedAt,
      );
    });
  } catch (error) {
    if (error instanceof InsightReadResult) return error.result;
    throw error;
  }
  // Keep an old version in history, but never show it as the newly edited note.
  const latest = await repository.readState(journalId);
  if (!sourceMatches(latest, input))
    return { status: "unavailable", reason: "changed" };
  return (
    ready ?? {
      status: "unavailable",
      reason: "failed",
      retryAfterMs: REFLECTION_INSIGHT_RETRY_MS,
    }
  );
}
