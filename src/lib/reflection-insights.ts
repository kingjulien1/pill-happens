import type { DailyCheckInPeriod } from "./daily-check-in";
import { reflectionStats } from "./reflection-writing";

export const REFLECTION_INSIGHT_MIN_WORDS = 20;

export type ReflectionInsightRequest = {
  day: string;
  period: DailyCheckInPeriod;
  note: string;
  /** Failed generations require an explicit retry after their cooldown. */
  retry?: boolean;
};

export type ReflectionInsightReady = {
  status: "ready";
  noteHash: string;
  summary: string;
  advice: string[];
  generatedAt: string;
};

export type ReflectionInsightResponse =
  | ReflectionInsightReady
  | { status: "pending"; noteHash: string; retryAfterMs: number }
  | {
      status: "unavailable";
      reason:
        "not_configured" | "save_first" | "too_short" | "failed" | "changed";
      retryAfterMs?: number;
    };

type InsightIdentity = {
  day: string;
  period: DailyCheckInPeriod;
  noteHash: string;
};

/** Server-owned derived data, independent of the check-in's saved timestamp. */
export type ReflectionInsightCacheEntry = InsightIdentity &
  (
    | ReflectionInsightReady
    | {
        status: "pending";
        token: string;
        startedAt: string;
        leaseUntil: string;
      }
    | { status: "failed"; failedAt: string; retryAt: string }
  );

export function reflectionInsightWordCount(note: string): number {
  return reflectionStats(note).words;
}

/** Twenty words exactly is still too short; Markdown scaffolding does not count. */
export function reflectionInsightEligible(note: string): boolean {
  return reflectionInsightWordCount(note) > REFLECTION_INSIGHT_MIN_WORDS;
}

/** Validate network data before any generated text reaches the dialog. */
export function parseReflectionInsightResponse(
  value: unknown,
): ReflectionInsightResponse | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const validHash =
    typeof entry.noteHash === "string" && /^[a-f0-9]{64}$/.test(entry.noteHash);
  const duration = (input: unknown) =>
    typeof input === "number" && Number.isFinite(input) && input >= 0;
  if (
    entry.status === "ready" &&
    validHash &&
    typeof entry.summary === "string" &&
    entry.summary.trim().length > 0 &&
    entry.summary.length <= 400 &&
    Array.isArray(entry.advice) &&
    entry.advice.length >= 2 &&
    entry.advice.length <= 3 &&
    entry.advice.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.length <= 180,
    ) &&
    typeof entry.generatedAt === "string" &&
    Number.isFinite(Date.parse(entry.generatedAt))
  )
    return {
      status: "ready",
      noteHash: entry.noteHash as string,
      summary: entry.summary,
      advice: [...entry.advice],
      generatedAt: entry.generatedAt,
    };
  if (entry.status === "pending" && validHash && duration(entry.retryAfterMs))
    return {
      status: "pending",
      noteHash: entry.noteHash as string,
      retryAfterMs: entry.retryAfterMs as number,
    };
  if (
    entry.status === "unavailable" &&
    ["not_configured", "save_first", "too_short", "failed", "changed"].includes(
      entry.reason as string,
    ) &&
    (entry.retryAfterMs === undefined || duration(entry.retryAfterMs))
  )
    return {
      status: "unavailable",
      reason: entry.reason as Extract<
        ReflectionInsightResponse,
        { status: "unavailable" }
      >["reason"],
      ...(entry.retryAfterMs === undefined
        ? {}
        : { retryAfterMs: entry.retryAfterMs as number }),
    };
  return null;
}
