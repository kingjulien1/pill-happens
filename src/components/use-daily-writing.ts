"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useJournalWorkspace, useWorkspaceSnapshot } from "./journal-drafts";
import { checkInDraftKey, isCheckInDraft } from "@/lib/check-in-draft";
import { checkInForDay, type DailyCheckIn } from "@/lib/daily-check-in";
import {
  dailyJournalDraftKey,
  dailyJournalForDay,
  isDailyWritingDraft,
  joinDailyWriting,
} from "@/lib/daily-journal";
import type { DraftWorkspace } from "@/lib/journal-drafts";

/** Move older device writing once. Keep every unfinished sleep or mood field. */
function adoptPeriodDrafts(
  store: DraftWorkspace,
  day: string,
  records?: readonly DailyCheckIn[],
) {
  const drafts = store.getSnapshot().drafts;
  const dailyKey = dailyJournalDraftKey(day);
  const legacy = (["morning", "evening"] as const).map((period) => {
    const key = checkInDraftKey(day, period);
    const value = drafts[key]?.value;
    const saved = checkInForDay(records, day, period);
    const draft =
      isCheckInDraft(value) && !value.dailyWriting ? value : undefined;
    return { key, draft, saved, note: draft?.note ?? saved?.note ?? "" };
  });
  if (!legacy.some(({ draft }) => draft)) return;
  if (
    !isDailyWritingDraft(drafts[dailyKey]?.value) &&
    legacy.some(
      ({ draft, saved }) => draft && draft.note !== (saved?.note ?? ""),
    )
  ) {
    const known = legacy.every(
      ({ saved, draft }) =>
        !draft ||
        draft.note === (saved?.note ?? "") ||
        draft.reflectionBaseUpdatedAt === (saved?.updatedAt ?? null),
    );
    const accepted = store.setDraft(dailyKey, {
      note: joinDailyWriting(legacy[0].note, legacy[1].note),
      ...(known
        ? {
            reflectionBaseUpdatedAt:
              dailyJournalForDay(records, day)?.updatedAt ?? null,
          }
        : {}),
    });
    if (!accepted) return;
  }
  for (const { key, draft } of legacy)
    if (draft) store.setDraft(key, { ...draft, dailyWriting: true, note: "" });
}

export function useDailyWriting(
  day: string,
  records?: readonly DailyCheckIn[],
) {
  const { store } = useJournalWorkspace();
  const key = dailyJournalDraftKey(day);
  const page = useMemo(() => dailyJournalForDay(records, day), [records, day]);
  useEffect(() => {
    adoptPeriodDrafts(store, day, records);
  }, [store, day, records]);
  const raw = useWorkspaceSnapshot(
    store,
    useCallback((snapshot) => snapshot.drafts[key]?.value, [key]),
  );
  const draft = isDailyWritingDraft(raw) ? raw : undefined;
  const note = draft?.note ?? page?.note ?? "";
  return {
    key,
    page,
    note,
    draft,
    baseUpdatedAt: draft
      ? draft.reflectionBaseUpdatedAt
      : (page?.updatedAt ?? null),
    setNote(value: string) {
      const current = store.getSnapshot().drafts[key]?.value;
      store.setDraft(key, {
        note: value,
        reflectionBaseUpdatedAt: isDailyWritingDraft(current)
          ? current.reflectionBaseUpdatedAt
          : (page?.updatedAt ?? null),
      });
    },
    acknowledge(updatedAt: string | null, sent: string) {
      const current = store.getSnapshot().drafts[key]?.value;
      if (!isDailyWritingDraft(current)) return;
      if (current.note === sent) store.clearDraft(key);
      else
        store.setDraft(key, { ...current, reflectionBaseUpdatedAt: updatedAt });
    },
  };
}
