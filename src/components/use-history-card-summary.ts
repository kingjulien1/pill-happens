"use client";

import { useEffect, useMemo } from "react";
import { useJournal } from "@/components/journal-provider";
import { useOptionalJournalWorkspace } from "@/components/journal-drafts";
import { dayKey, type AppData } from "@/lib/domain";
import {
  buildHistoryCardSummary,
  createHistoryCardIndex,
  historyCardCacheable,
  historyCardSource,
  readHistoryCardCache,
  removeHistoryCardCache,
  writeHistoryCardCache,
} from "@/lib/history-card-cache";

const historyIndexes = new WeakMap<
  AppData,
  ReturnType<typeof createHistoryCardIndex>
>();

function historyIndex(data: AppData) {
  let index = historyIndexes.get(data);
  if (!index) {
    index = createHistoryCardIndex(data);
    historyIndexes.set(data, index);
  }
  return index;
}

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
  const index = useMemo(() => historyIndex(data), [data]);
  const source = useMemo(
    () => historyCardSource(data, day, index),
    [data, day, index],
  );
  const cacheable = useMemo(
    () =>
      Boolean(
        scope &&
        trackingDay &&
        historyCardCacheable(data, day, trackingDay, index),
      ),
    [data, day, scope, trackingDay, index],
  );
  const cached = useMemo(() => {
    const summary = cacheable
      ? readHistoryCardCache(deviceStorage(), scope!, day, source.fingerprint)
      : null;
    return {
      source,
      cacheable,
      persisted: summary !== null,
      summary: summary ?? buildHistoryCardSummary(data, day, source),
    };
  }, [data, day, source, cacheable, scope]);

  useEffect(() => {
    if (!scope) return;
    if (cached.cacheable) {
      // A validated cache hit is already durable; do not serialize/read it again.
      if (!cached.persisted)
        writeHistoryCardCache(
          deviceStorage(),
          scope,
          day,
          cached.source.fingerprint,
          cached.summary,
        );
    } else removeHistoryCardCache(deviceStorage(), scope, day);
  }, [cached, day, scope]);
  return cached.summary;
}
