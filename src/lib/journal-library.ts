import {
  checkInForDay,
  getCheckInPeriod,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "./daily-check-in";
import {
  checkInDefaults,
  isCheckInDraft,
  type CheckInDraft,
} from "./check-in-draft";
import { formatDay, isValidDayKey } from "./domain";
import { reflectionStats } from "./reflection-writing";

/** The collection is for saved, longer writing; exactly 100 words stays in its day. */
export const JOURNAL_LIBRARY_MIN_WORDS = 100;
export type JournalLibraryEntry = {
  id: string;
  day: string;
  /** Internal edit identity only; the collection never labels or styles periods. */
  period: DailyCheckInPeriod;
  checkIn: DailyCheckIn;
  value: string;
  title: string;
  excerpt: string;
  words: number;
  readingMinutes: number;
};

function versionTime(entry: DailyCheckIn) {
  const updated = Date.parse(entry.updatedAt);
  if (Number.isFinite(updated)) return updated;
  const created = Date.parse(entry.createdAt);
  return Number.isFinite(created) ? created : -Infinity;
}

/** Heading labels are plain text; code fences and HTML comments are not titles. */
export function journalEntryTitle(value: string, day: string) {
  let fence = "";
  let fenceLength = 0;
  let comment = false;
  let previous = "";
  for (const raw of value.split("\n")) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(raw);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence &&
        marker[1].length >= fenceLength &&
        !marker[2].trim()
      )
        fence = "";
      continue;
    }
    if (marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
      fence = marker[1][0];
      fenceLength = marker[1].length;
      previous = "";
      continue;
    }
    let line = raw;
    if (comment) {
      const end = line.indexOf("-->");
      if (end < 0) continue;
      line = line.slice(end + 3);
      comment = false;
    }
    for (;;) {
      const start = line.indexOf("<!--");
      if (start < 0) break;
      const end = line.indexOf("-->", start + 4);
      if (end < 0) {
        line = line.slice(0, start);
        comment = true;
        break;
      }
      line = line.slice(0, start) + line.slice(end + 3);
    }
    const atx = /^ {0,3}#{1,6}[ \t]+(.+?)\s*$/.exec(line);
    const title = atx
      ? atx[1].replace(/[ \t]+#+[ \t]*$/, "")
      : previous && /^ {0,3}(?:=+|-+)[ \t]*$/.test(line)
        ? previous
        : "";
    if (title) {
      const plain = reflectionStats(title).excerpt;
      if (plain) return plain;
    }
    previous = /^\S|^ {1,3}\S/.test(line) ? line.trim() : "";
  }
  return formatDay(day, {
    weekday: undefined,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Newest saved version wins before eligibility; local drafts are never a source. */
export function journalLibraryEntries(
  checkIns: readonly DailyCheckIn[] | undefined,
): JournalLibraryEntry[] {
  const candidates = [...(checkIns ?? [])].sort((a, b) => {
    const first = versionTime(a);
    const second = versionTime(b);
    return first === second ? 0 : first > second ? -1 : 1;
  });
  const days = new Map<string, DailyCheckIn[]>();
  for (const checkIn of candidates) {
    if (!isValidDayKey(checkIn.day)) continue;
    const bucket = days.get(checkIn.day);
    if (bucket) bucket.push(checkIn);
    else days.set(checkIn.day, [checkIn]);
  }
  const entries: JournalLibraryEntry[] = [];
  for (const [day, saved] of days) {
    for (const period of ["morning", "evening"] as const) {
      const checkIn = checkInForDay(saved, day, period);
      if (!checkIn || !checkIn.note.trim()) continue;
      const stats = reflectionStats(checkIn.note);
      if (stats.words <= JOURNAL_LIBRARY_MIN_WORDS) continue;
      entries.push({
        id: `${day}:${getCheckInPeriod(checkIn)}`,
        day,
        period,
        checkIn,
        value: checkIn.note,
        title: journalEntryTitle(checkIn.note, day),
        excerpt: stats.excerpt,
        words: stats.words,
        readingMinutes: stats.readingMinutes,
      });
    }
  }
  return entries.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      (versionTime(a.checkIn) === versionTime(b.checkIn)
        ? a.id.localeCompare(b.id)
        : versionTime(a.checkIn) > versionTime(b.checkIn)
          ? -1
          : 1),
  );
}

/** Open the existing writer without replacing any unfinished field or version marker. */
export function journalEntryEditDraft(
  checkIn: DailyCheckIn,
  current: unknown,
): CheckInDraft {
  return {
    ...(isCheckInDraft(current)
      ? current
      : checkInDefaults(checkIn, getCheckInPeriod(checkIn))),
    writingOpen: true,
  };
}
