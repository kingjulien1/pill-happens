import type { DailyCheckIn } from "./daily-check-in";
import { isCheckInDraft } from "./check-in-draft";

export type DayBoundaryTime = {
  time: string;
  source: "default" | "saved" | "draft";
};

const validClock = (value: unknown): value is string =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

function resolveClock(
  raw: string | undefined,
  saved: unknown,
  fallback: string,
): DayBoundaryTime {
  if (raw !== undefined) {
    if (!raw.trim()) return { time: fallback, source: "default" };
    if (validClock(raw))
      return { time: raw, source: raw === saved ? "saved" : "draft" };
    // An unfinished field must not replace a previously saved, valid clock.
  }
  return validClock(saved)
    ? { time: saved, source: "saved" }
    : { time: fallback, source: "default" };
}

/** Display-only personal day markers, independent of the journal's 06:00 reset. */
export function getDayBoundaryTimes({
  morning,
  evening,
  morningDraft,
  eveningDraft,
}: {
  morning?: DailyCheckIn;
  evening?: DailyCheckIn;
  morningDraft?: unknown;
  eveningDraft?: unknown;
}) {
  return {
    wakeUp: resolveClock(
      isCheckInDraft(morningDraft)
        ? morningDraft.morningSleep?.gotUp
        : undefined,
      morning?.morningSleep?.gotUp,
      "12:30",
    ),
    bedtime: resolveClock(
      isCheckInDraft(eveningDraft) ? eveningDraft.bedtime : undefined,
      evening?.bedtime,
      "23:30",
    ),
  };
}
