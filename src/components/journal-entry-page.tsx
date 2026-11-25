"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  NotebookPen,
  PencilLine,
} from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { PageHeading, PageSurface } from "@/components/page-heading";
import { ReflectionMarkdown } from "@/components/reflection-markdown";
import {
  ReferenceBackLink,
  ReferenceEmpty,
} from "@/components/journal-reference-detail-parts";
import { dailyJournalForDay } from "@/lib/daily-journal";
import {
  checkInDraftKey,
  checkInDefaults,
  isCheckInDraft,
} from "@/lib/check-in-draft";
import { useJournalWorkspace } from "./journal-drafts";
import { checkInForDay } from "@/lib/daily-check-in";
import { formatDay } from "@/lib/domain";
import { reflectionStats } from "@/lib/reflection-writing";
import styles from "./journal-reference-details.module.css";
import { Button } from "@/components/ui/button";

/** Direct journal links have no collection word-count threshold. */
export function JournalEntryPage({ day }: { day: string }) {
  const { data } = useJournal();
  const { store } = useJournalWorkspace();
  if (!data) return null;
  const entry = dailyJournalForDay(data.dailyCheckIns, day);
  const note = entry?.note ?? "";
  const stats = reflectionStats(note);
  const editHref = `/history/${day}?checkin=morning`;
  const openWriter = () => {
    const key = checkInDraftKey(day, "morning");
    const current = store.getSnapshot().drafts[key]?.value;
    const initial = checkInDefaults(
      checkInForDay(data.dailyCheckIns, day, "morning"),
      "morning",
    );
    store.setDraft(key, {
      ...(isCheckInDraft(current)
        ? current
        : { ...initial, dailyWriting: true, note: "" }),
      writingOpen: true,
    });
  };
  const changed =
    entry && Number.isFinite(Date.parse(entry.updatedAt))
      ? new Intl.DateTimeFormat("en", {
          timeZone: data.settings.timezone,
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(entry.updatedAt))
      : null;
  return (
    <div
      className={styles.page}
      data-journal-entry-page
      data-journal-entry-day={day}
    >
      <ReferenceBackLink href="/journal">Your journal</ReferenceBackLink>
      <PageHeading
        title="Daily Journal"
        context={formatDay(day, { month: "short", year: "numeric" })}
        icon={<NotebookPen />}
        actions={
          <Button
            navigation
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={editHref} onNavigate={openWriter} />}
            className={`${styles.action} h-auto p-0`}
          >
            <PencilLine size={14} aria-hidden="true" />
            {note.trim() ? "Continue writing" : "Open check-in"}
          </Button>
        }
      >
        One page for the whole tracking day. Add to it from either check-in.
      </PageHeading>
      {note.trim() ? (
        <>
          <div className={styles.readingMeta}>
            <span>
              <BookOpenText size={15} aria-hidden="true" />
              <strong>{stats.words.toLocaleString("en")}</strong>{" "}
              {stats.words === 1 ? "word" : "words"}
              <span aria-hidden="true">·</span>~{stats.readingMinutes} min read
            </span>
            <Button
              navigation
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/history/${day}`} />}
              className={`${styles.periodLink} h-auto p-0`}
            >
              Daily log
              <ArrowUpRight size={13} aria-hidden="true" />
            </Button>
          </div>
          <PageSurface
            className={styles.reading}
            data-card-entry
            data-journal-reading-content
          >
            <ReflectionMarkdown value={note} day={day} />
          </PageSurface>
          <footer className={styles.readingFooter}>
            <p className={styles.footerStat}>
              {changed ? (
                <>
                  Updated <time dateTime={entry?.updatedAt}>{changed}</time>
                </>
              ) : (
                "Saved in your check-in"
              )}
            </p>
            <span>{stats.characters.toLocaleString("en")} characters</span>
          </footer>
        </>
      ) : (
        <ReferenceEmpty title="This page is still unwritten">
          {entry
            ? "Your check-in is saved, but no journal text has been added. A sentence is enough to start."
            : "There is no saved journal entry for this check-in yet. Open it whenever you want to leave a few words."}
        </ReferenceEmpty>
      )}
      <nav className={styles.readingFooter} aria-label="Related journal pages">
        <Button
          navigation
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/history/${day}`} />}
          className={`${styles.periodLink} h-auto p-0`}
        >
          Back to this day
          <ArrowUpRight size={13} aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
