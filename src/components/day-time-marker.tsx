"use client";

import { useSyncExternalStore } from "react";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { checkInDraftKey } from "@/lib/check-in-draft";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import { getDayBoundaryTimes } from "@/lib/day-boundary-times";
import styles from "./day-time-marker.module.css";

/** Subscribe here so writing in a check-in never rerenders the whole intake stack. */
export function DayTimeMarker({
  day,
  checkIn,
  position,
}: {
  day: string;
  checkIn?: DailyCheckIn;
  position: "start" | "end";
}) {
  const morning = position === "start";
  const period = morning ? "morning" : "evening";
  const { store } = useJournalWorkspace();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const rawDraft = snapshot.drafts[checkInDraftKey(day, period)]?.value;
  const times = getDayBoundaryTimes(
    morning
      ? { morning: checkIn, morningDraft: rawDraft }
      : { evening: checkIn, eveningDraft: rawDraft },
  );
  const boundary = morning ? times.wakeUp : times.bedtime;
  const label = morning ? "Wake-up" : "Bedtime";
  const checkInLabel = morning ? "Morning" : "Evening";
  const context =
    boundary.source === "default"
      ? `Default time. Set yours in ${checkInLabel} Check-In.`
      : boundary.source === "draft"
        ? `From your ${checkInLabel} Check-In draft; not saved yet.`
        : `From your saved ${checkInLabel} Check-In.`;
  return (
    <div
      className={styles.marker}
      role="group"
      data-day-time-marker={position}
      data-time-source={boundary.source}
      title={context}
      aria-label={`${label}: ${boundary.time}. ${context}`}
    >
      <span className={styles.label} aria-hidden="true">
        {label}
      </span>
      <time dateTime={boundary.time}>{boundary.time}</time>
    </div>
  );
}
