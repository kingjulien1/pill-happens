import {
  checkInForDay,
  getCheckInPeriod,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "@/lib/daily-check-in";
import {
  dailyJournalForDay,
  dailyJournalFromPeriods,
} from "@/lib/daily-journal";
import { dayKey, type AppData } from "@/lib/domain";
import {
  DailyReflectionSaveError,
  saveDailyReflection,
} from "./daily-reflection";
import { upsertDailyCheckIn } from "./daily-check-ins";
import type { DailyCheckInInput } from "./validation";
import type { UndoTarget } from "./journal-undo";

type Writing = {
  day: string;
  period: DailyCheckInPeriod;
  note: string;
  expectedUpdatedAt?: string | null;
  sharedJournal?: true;
};

function writingChange(state: AppData, input: Writing, now: Date) {
  if (input.day > dayKey(now, state.settings.timezone))
    throw new DailyReflectionSaveError(
      400,
      "A journal page cannot be saved for a future tracking day.",
    );
  const morning = checkInForDay(state.dailyCheckIns, input.day, "morning");
  const evening = checkInForDay(state.dailyCheckIns, input.day, "evening");
  const page = dailyJournalFromPeriods(morning, evening);
  const local = input.period === "morning" ? morning : evening;
  const ownerPeriod = page ? getCheckInPeriod(page) : input.period;
  const owner = ownerPeriod === "morning" ? morning : evening;
  const peer = ownerPeriod === "morning" ? evening : morning;
  // Cached pre-update clients only saw their period's text. An unchanged local
  // note may accompany a ratings save, but cannot replace an unseen daily page.
  const legacy =
    !input.sharedJournal && (local?.note ?? "") !== (page?.note ?? "");
  const note =
    legacy && (local?.note ?? "") === input.note
      ? (page?.note ?? "")
      : input.note;
  const changed = (page?.note ?? "") !== note;
  const version =
    page?.updatedAt ??
    (input.sharedJournal ? null : (local?.updatedAt ?? null));
  if (changed && (legacy || version !== (input.expectedUpdatedAt ?? null)))
    throw new DailyReflectionSaveError(
      409,
      "This daily page changed elsewhere. Your draft is kept on this device. Reopen the latest page before saving again.",
    );
  const savedTime = Date.parse(page?.updatedAt ?? "");
  const time = Number.isFinite(savedTime)
    ? new Date(Math.max(now.getTime(), savedTime + 1))
    : now;
  return { local, owner, ownerPeriod, peer, note, changed, time };
}

function foldHistoricalNote(
  state: AppData,
  peer: DailyCheckIn | undefined,
  time: Date,
) {
  if (!peer?.note.trim()) return;
  state.dailyCheckIns = state.dailyCheckIns?.map((record) =>
    record === peer
      ? { ...record, note: "", updatedAt: time.toISOString() }
      : record,
  );
}

/** Both entry points resolve the owner inside the repository's atomic mutation. */
export function saveDayWriting(state: AppData, input: Writing, now: Date) {
  applyWritingChange(state, input.day, writingChange(state, input, now));
}

function applyWritingChange(
  state: AppData,
  day: string,
  change: ReturnType<typeof writingChange>,
) {
  const { owner, ownerPeriod, peer, note, changed, time } = change;
  if (!changed) return;
  if (owner && owner.note === note && peer?.note.trim()) {
    // An edit may remove exactly the legacy second half. Advance the remaining
    // owner's version even though its physical column already holds those words.
    state.dailyCheckIns = state.dailyCheckIns?.map((record) =>
      record === owner ? { ...record, updatedAt: time.toISOString() } : record,
    );
  } else {
    saveDailyReflection(
      state,
      {
        day,
        period: ownerPeriod,
        note,
        expectedUpdatedAt: owner?.updatedAt ?? null,
      },
      time,
    );
  }
  foldHistoricalNote(state, peer, time);
}

export function dailyCheckInUndoTarget(
  state: AppData,
  input: DailyCheckInInput,
): UndoTarget {
  const page = dailyJournalForDay(state.dailyCheckIns, input.day);
  const peer = checkInForDay(
    state.dailyCheckIns,
    input.day,
    input.period === "morning" ? "evening" : "morning",
  );
  return {
    kind:
      peer?.note.trim() && page?.note !== input.note
        ? "daily-page-check-in"
        : "check-in",
    day: input.day,
    period: input.period,
  };
}

export function saveDayCheckIn(
  state: AppData,
  input: DailyCheckInInput,
  now: Date,
) {
  const change = writingChange(state, input, now);
  const { ownerPeriod, peer, note, changed, time } = change;
  const { sharedJournal: _protocol, expectedCheckInAt, ...fields } = input;
  if (
    (expectedCheckInAt || (!input.sharedJournal && input.expectedUpdatedAt)) &&
    !change.local
  )
    throw new DailyReflectionSaveError(
      409,
      "This check-in was removed elsewhere. Your unfinished answers are kept on this device.",
    );
  void _protocol;
  if (changed && ownerPeriod !== input.period)
    applyWritingChange(state, input.day, change);
  const local = checkInForDay(state.dailyCheckIns, input.day, input.period);
  const savedHere = changed && ownerPeriod === input.period;
  upsertDailyCheckIn(
    state,
    {
      ...fields,
      note: savedHere ? note : (local?.note ?? ""),
      expectedUpdatedAt: local?.updatedAt ?? null,
    },
    savedHere ? time : now,
  );
  if (savedHere) foldHistoricalNote(state, peer, time);
}
