"use client";

import { useEffect, useMemo } from "react";
import { useJournal } from "@/components/journal-provider";
import { useOptionalJournalWorkspace } from "@/components/journal-drafts";
import { dayKey, type AppData } from "@/lib/domain";
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
  const trackingDay = now ? dayKey(now, data.settings.timezone) : null;
  const source = useMemo(() => historyCardSource(data, day), [data, day]);
  const cacheable = useMemo(
    () =>
      Boolean(
        scope && trackingDay && historyCardCacheable(data, day, trackingDay),
      ),
    [data, day, scope, trackingDay],
  );
  const cached = useMemo(() => {
    const summary = cacheable
      ? readHistoryCardCache(deviceStorage(), scope!, day, source.fingerprint)
      : null;
    return {
      source,
      cacheable,
      summary: summary ?? buildHistoryCardSummary(data, day, source),
    };
  }, [data, day, source, cacheable, scope]);

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
