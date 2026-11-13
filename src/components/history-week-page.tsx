"use client";

import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { PageHeading } from "@/components/page-heading";
import { HistoryDayCard } from "@/components/history-day-card";
import {
  ReferenceBackLink,
  ReferenceEmpty,
  ReferenceHero,
  ReferenceMedicationCard,
  ReferenceMetrics,
  ReferenceSectionHeading,
} from "@/components/journal-reference-detail-parts";
import { formatDay, shiftDayKey } from "@/lib/domain";
import { weekRecordDetails } from "@/lib/journal-reference-details";
import styles from "./journal-reference-details.module.css";

export function HistoryWeekPage({ start }: { start: string }) {
  const { data } = useJournal();
  if (!data) return null;
  const week = weekRecordDetails(data, start);
  const short = (day: string) =>
    formatDay(day, { weekday: undefined, month: "short", day: "numeric" });
  const adjacent = (offset: number) => {
    try {
      return shiftDayKey(start, offset);
    } catch {
      return null;
    }
  };
  const previous = adjacent(-7);
  const next = adjacent(7);
  return (
    <div className={styles.page} data-week-detail={start}>
      <ReferenceBackLink href="/history">Past Days</ReferenceBackLink>
      <PageHeading
        title={`Week ${week.weekNumber}`}
        context={`${week.weekYear} · Monday to Sunday`}
        icon={<CalendarRange />}
      >
        A week at a glance. Recorded days and reflections, gathered without
        filling in the blanks.
      </PageHeading>
      <ReferenceHero
        artwork={
          <span className={styles.calendarArtwork}>
            <CalendarRange size={42} strokeWidth={2.2} />
          </span>
        }
        eyebrow={`ISO week ${week.weekNumber} · ${week.weekYear}`}
        title={
          <span className={styles.weekRange}>
            <time dateTime={week.start}>{short(week.start)}</time>
            <span>—</span>
            <time dateTime={week.end}>{short(week.end)}</time>
          </span>
        }
      >
        {week.days.length
          ? `${week.days.length} of 7 tracking days have saved entries. Each day runs from 06:00 to the following 06:00 in your journal’s timezone.`
          : "No intakes or check-ins are saved in this week yet."}
      </ReferenceHero>
      <ReferenceMetrics
        items={[
          { value: week.days.length, label: "days with entries" },
          { value: week.count, label: "recorded intakes" },
          { value: week.records.length, label: "medications logged" },
        ]}
      />
      <section
        className={styles.section}
        aria-label="Recorded days in this week"
      >
        <ReferenceSectionHeading
          title="Days, in your words"
          detail="Newest first"
        />
        {week.days.length ? (
          week.days.map((day) => (
            <HistoryDayCard key={day} data={data} day={day} />
          ))
        ) : (
          <ReferenceEmpty title="A little room in the timeline">
            Only days with a saved intake or check-in appear here. There are no
            placeholder entries to catch up on.
          </ReferenceEmpty>
        )}
      </section>
      {week.records.length > 0 && (
        <section
          className={styles.section}
          aria-label="Medication totals for this week"
        >
          <ReferenceSectionHeading
            title="This week’s medications"
            detail="Amounts stay separate"
          />
          {week.records.map((record) => (
            <ReferenceMedicationCard
              key={record.medicationId}
              record={record}
            />
          ))}
          <p className={styles.footnote}>
            Each total belongs to one medication and uses its recorded strength.
            Quantities in different forms stay separate.
          </p>
        </section>
      )}
      <nav aria-label="Adjacent weeks" className={styles.weekNavigation}>
        {previous ? (
          <Link className={styles.action} href={`/history/weeks/${previous}`}>
            <ChevronLeft size={14} aria-hidden="true" />
            Previous week
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className={styles.action} href={`/history/weeks/${next}`}>
            Next week
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </nav>
    </div>
  );
}
