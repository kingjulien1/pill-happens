"use client";

import { PageHeading } from "@/components/page-heading";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, BookOpenText, Search, X } from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { MedicationCardBase } from "@/components/medication-card-base";
import { ReflectionReaderDialog } from "@/components/reflection-reader-dialog";
import { checkInDraftKey } from "@/lib/check-in-draft";
import { formatDay } from "@/lib/domain";
import {
  journalEntryEditDraft,
  journalLibraryEntries,
  type JournalLibraryEntry,
} from "@/lib/journal-library";
import styles from "./journal-library-page.module.css";

const PAGE_SIZE = 20;

/** A reading collection of saved pages; unfinished writing stays in its check-in. */
export function JournalLibraryPage() {
  const { data } = useJournal();
  const workspace = useJournalWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const entries = useMemo(
    () => journalLibraryEntries(data?.dailyCheckIns),
    [data?.dailyCheckIns],
  );
  const search = query.trim().toLocaleLowerCase("en");
  const filtered = search
    ? entries.filter((entry) =>
        `${entry.title}\n${entry.value}\n${formatDay(entry.day, { year: "numeric" })}`
          .toLocaleLowerCase("en")
          .includes(search),
      )
    : entries;
  const selected = entries.find((entry) => entry.id === selectedId);

  const editEntry = (entry: JournalLibraryEntry) => {
    const path = `/history/${entry.day}`;
    const key = checkInDraftKey(entry.day, entry.period);
    const current = workspace.store.getSnapshot().drafts[key]?.value;
    workspace.store.setDraft(
      key,
      journalEntryEditDraft(entry.checkIn, current),
    );
    // Declare the route first: rememberDestination clears that route's old dialog.
    workspace.rememberDestination(path);
    workspace.store.openDialog(path, {
      kind: "check-in",
      day: entry.day,
      period: entry.period,
    });
    router.push(path, { scroll: false });
  };

  if (!data) return null;
  return (
    <section className={styles.library} data-journal-library>
      <PageHeading
        title="Journal"
        context="A little room for words"
        icon={<BookOpenText strokeWidth={2} />}
        actions={
          <span
            className={styles.total}
            data-journal-entry-count={entries.length}
          >
            <strong>{entries.length.toLocaleString("en")}</strong>
            <span>{entries.length === 1 ? "page" : "pages"}</span>
          </span>
        }
      >
        The thoughts that wanted a little more room. Your longer writing,
        gathered into pages to read, return to and make your own.
      </PageHeading>

      {entries.length > 0 && (
        <div className={styles.searchRow} role="search">
          <Search aria-hidden="true" strokeWidth={1.8} />
          <input
            type="search"
            value={query}
            aria-label="Search journal pages"
            placeholder="Find a thought, a word, a day…"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLimit(PAGE_SIZE);
              }}
              aria-label="Clear journal search"
              title="Clear search"
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <p className={styles.collectionLabel} aria-live="polite">
        {search
          ? `${filtered.length.toLocaleString("en")} ${filtered.length === 1 ? "page matches" : "pages match"}`
          : "Saved words, ready to revisit"}
      </p>

      {filtered.length ? (
        <div className={styles.entries} data-journal-entries>
          {filtered.slice(0, limit).map((entry) => (
            <MedicationCardBase
              key={entry.id}
              className={styles.entry}
              color="lilac"
              icon="notebook-text"
              data-card-entry
              data-journal-entry={entry.id}
              data-journal-entry-words={entry.words}
              aria-label={`Read ${entry.title}, ${formatDay(entry.day, { year: "numeric" })}, ${entry.words.toLocaleString("en")} words, ${entry.readingMinutes} minute read`}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
                setSelectedId(entry.id);
                setReaderOpen(true);
              }}
            >
              <div className={`intake-card-details ${styles.entryDetails}`}>
                <time
                  className={`intake-card-time ${styles.entryDate}`}
                  dateTime={entry.day}
                  title={formatDay(entry.day, { year: "numeric" })}
                >
                  {formatDay(entry.day, {
                    weekday: undefined,
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                <span
                  className={`intake-card-name ${styles.entryTitle}`}
                  title={entry.title}
                >
                  {entry.title}
                </span>
                <span className={styles.excerpt}>{entry.excerpt}</span>
                <span className={styles.entryBottom}>
                  <span>{entry.words.toLocaleString("en")} words</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.readingMinutes} min read</span>
                </span>
              </div>
            </MedicationCardBase>
          ))}
        </div>
      ) : (
        <div className={styles.empty} data-journal-empty>
          <BookOpenText aria-hidden="true" strokeWidth={1.5} />
          <h2>
            {search
              ? "No page found that thought"
              : "A page will find its way here"}
          </h2>
          <p>
            {search
              ? "Try another word, a date or a shorter phrase. Your saved pages are still right here."
              : "Write a little longer in any check-in. Once your saved writing passes 100 words, it has a place here too."}
          </p>
        </div>
      )}

      {filtered.length > limit && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={() => setLimit((previous) => previous + PAGE_SIZE)}
          data-journal-load-more
        >
          <ArrowDown aria-hidden="true" size={15} /> More pages
        </button>
      )}
      <p className={styles.footnote}>
        Saved writing with more than 100 words appears here. Shorter notes and
        unfinished drafts stay with their daily check-in.
      </p>
      {selected && (
        <ReflectionReaderDialog
          open={readerOpen}
          onOpenChange={setReaderOpen}
          value={selected.value}
          day={selected.day}
          onEdit={() => editEntry(selected)}
          returnFocus={returnFocus}
        />
      )}
    </section>
  );
}
