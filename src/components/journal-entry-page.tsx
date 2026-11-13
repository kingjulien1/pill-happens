"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Coffee,
  MoonStar,
  PencilLine,
} from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { PageHeading, PageSurface } from "@/components/page-heading";
import { ReflectionMarkdown } from "@/components/reflection-markdown";
import {
  ReferenceBackLink,
  ReferenceEmpty,
} from "@/components/journal-reference-detail-parts";
import { checkInForDay, type DailyCheckInPeriod } from "@/lib/daily-check-in";
import { formatDay } from "@/lib/domain";
import { reflectionStats } from "@/lib/reflection-writing";
import styles from "./journal-reference-details.module.css";

/** Direct journal links have no collection word-count threshold. */
export function JournalEntryPage({
  day,
  period,
}: {
  day: string;
  period: DailyCheckInPeriod;
}) {
  const { data } = useJournal();
  if (!data) return null;
  const entry = checkInForDay(data.dailyCheckIns, day, period);
  const note = entry?.note ?? "";
  const stats = reflectionStats(note);
  const morning = period === "morning";
  const title = morning ? "Morning Reflection" : "Evening Reflection";
  const sibling = morning ? "evening" : "morning";
  const other = checkInForDay(data.dailyCheckIns, day, sibling);
  const editHref = `/history/${day}?checkin=${period}`;
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
      data-journal-entry-period={period}
    >
      <ReferenceBackLink href="/journal">Your journal</ReferenceBackLink>
      <PageHeading
        title={title}
        context={formatDay(day, { month: "short", year: "numeric" })}
        icon={morning ? <Coffee /> : <MoonStar />}
        actions={
          <Link className={styles.action} href={editHref}>
            <PencilLine size={14} aria-hidden="true" />
            {note.trim() ? "Continue writing" : "Open check-in"}
          </Link>
        }
      >
        {morning
          ? "Before the day gets loud. Your morning, exactly as you left it."
          : "A little space after the noise. Your evening, in your own words."}
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
            <Link href={`/history/${day}`} className={styles.periodLink}>
              Daily log
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
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
        <Link href={`/history/${day}`} className={styles.periodLink}>
          Back to this day
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
        {other?.note.trim() && (
          <Link
            href={`/journal/${day}/${sibling}`}
            className={styles.periodLink}
          >
            {morning ? "Evening" : "Morning"} Reflection
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        )}
      </nav>
    </div>
  );
}
