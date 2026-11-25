import {
  checkInForDay,
  getCheckInPeriod,
  type DailyCheckInPeriod,
  type DailyCheckIn,
} from "./daily-check-in";

/** Two maximum-length legacy pages and their Markdown divider must fit intact. */
export const DAILY_JOURNAL_MAX_LENGTH = 200_007;

/** Historical pages are read in writing order. Exact duplicates only appear once. */
export function joinDailyWriting(morning: string, evening: string) {
  if (!morning.trim()) return evening;
  if (!evening.trim() || evening === morning) return morning;
  return morning + "\n\n---\n\n" + evening;
}

/** A single backing check-in owns new writing, whichever check-in was used first. */
export function dailyJournalForDay(
  records: readonly DailyCheckIn[] | undefined,
  day: string,
) {
  const morning = checkInForDay(records, day, "morning");
  const evening = checkInForDay(records, day, "evening");
  return dailyJournalFromPeriods(morning, evening);
}

export function dailyJournalFromPeriods(
  morning?: DailyCheckIn,
  evening?: DailyCheckIn,
) {
  if (!morning?.note.trim()) return evening?.note.trim() ? evening : undefined;
  if (!evening?.note.trim()) return morning;
  return {
    ...morning,
    note: joinDailyWriting(morning.note, evening.note),
    updatedAt:
      Date.parse(evening.updatedAt) > Date.parse(morning.updatedAt)
        ? evening.updatedAt
        : morning.updatedAt,
  };
}

/** Resolve duplicate imported records before joining the two historical periods. */
export function dailyJournalPages(
  records: readonly DailyCheckIn[] | undefined,
) {
  const days = new Map<
    string,
    Partial<Record<DailyCheckInPeriod, DailyCheckIn>>
  >();
  const version = (entry: DailyCheckIn) => {
    const updated = Date.parse(entry.updatedAt);
    return Number.isFinite(updated) ? updated : Date.parse(entry.createdAt);
  };
  for (const record of records ?? []) {
    const pair = days.get(record.day) ?? {};
    const period = getCheckInPeriod(record);
    const previous = pair[period];
    if (!previous || version(record) > version(previous)) pair[period] = record;
    days.set(record.day, pair);
  }
  const pages = new Map<string, DailyCheckIn>();
  for (const [day, pair] of days) {
    const page = dailyJournalFromPeriods(pair.morning, pair.evening);
    if (page) pages.set(day, page);
  }
  return pages;
}

export const dailyJournalDraftKey = (day: string) => `journal:${day}`;
export type DailyWritingDraft = {
  note: string;
  reflectionBaseUpdatedAt?: string | null;
};
export function isDailyWritingDraft(
  value: unknown,
): value is DailyWritingDraft {
  if (
    !value ||
    typeof value !== "object" ||
    !("note" in value) ||
    typeof value.note !== "string" ||
    value.note.length > DAILY_JOURNAL_MAX_LENGTH
  )
    return false;
  const version =
    "reflectionBaseUpdatedAt" in value
      ? value.reflectionBaseUpdatedAt
      : undefined;
  return (
    version == null ||
    (typeof version === "string" && Number.isFinite(Date.parse(version)))
  );
}
