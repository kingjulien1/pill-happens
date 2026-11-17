"use client";

import { useEffect, useMemo } from "react";
import { useJournal } from "@/components/journal-provider";
import { useOptionalJournalWorkspace } from "@/components/journal-drafts";
import type { AppData } from "@/lib/domain";
import {
  buildHistoryCardSummary,
  historyCardCacheable,
  historyCardSource,
  readHistoryCardCache,
  removeHistoryCardCache,
  writeHistoryCardCache,
} from "@/lib/history-card-cache";

function deviceStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Memoized live state wins over a cache on every source or medication edit. */
export function useHistoryCardSummary(data: AppData, day: string) {
  const workspace = useOptionalJournalWorkspace();
  const { now } = useJournal();
  const scope = workspace?.store.getSnapshot().scope;
  const cached = useMemo(() => {
    const source = historyCardSource(data, day);
    const cacheable = Boolean(
      scope && now && historyCardCacheable(data, day, now),
    );
    const summary = cacheable
      ? readHistoryCardCache(deviceStorage(), scope!, day, source.fingerprint)
      : null;
    return {
      source,
      cacheable,
      summary: summary ?? buildHistoryCardSummary(data, day, source),
    };
  }, [data, day, now, scope]);

  useEffect(() => {
    if (!scope) return;
    if (cached.cacheable)
      writeHistoryCardCache(
        deviceStorage(),
        scope,
        day,
        cached.source.fingerprint,
        cached.summary,
      );
    else removeHistoryCardCache(deviceStorage(), scope, day);
  }, [cached, day, scope]);
  return cached.summary;
}
