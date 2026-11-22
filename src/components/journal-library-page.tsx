"use client";

import { PageEmptyState, PageHeading } from "@/components/page-heading";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, BookOpenText, Search, X } from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { JournalPreviewCard } from "@/components/journal-preview-card";
import { ReflectionReaderDialog } from "@/components/reflection-reader-dialog";
import { checkInDraftKey } from "@/lib/check-in-draft";
import { dayKey, formatDay } from "@/lib/domain";
import { createJournalPreviewReferenceExtractor } from "@/lib/journal-preview-references";
import {
  journalEntryEditDraft,
  journalLibraryEntries,
  type JournalLibraryEntry,
} from "@/lib/journal-library";
import styles from "./journal-library-page.module.css";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

/** A reading collection of saved pages; unfinished writing stays in its check-in. */
export function JournalLibraryPage() {
  const { data, now } = useJournal();
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
  const filtered = useMemo(
    () =>
      search
        ? entries.filter((entry) =>
            `${entry.title}\n${entry.value}\n${formatDay(entry.day, { year: "numeric" })}`
              .toLocaleLowerCase("en")
              .includes(search),
          )
        : entries,
    [entries, search],
  );
  const today = data && now ? dayKey(now, data.settings.timezone) : undefined;
  const extractReferences = useMemo(
    () => createJournalPreviewReferenceExtractor(data, today),
    [data, today],
  );
  const visibleEntries = useMemo(
    () =>
      filtered.slice(0, limit).map((entry) => ({
        entry,
        references: extractReferences(entry.value, entry.day),
      })),
    [filtered, limit, extractReferences],
  );
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
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => {
                setQuery("");
                setLimit(PAGE_SIZE);
              }}
              aria-label="Clear journal search"
              title="Clear search"
            >
              <X aria-hidden="true" />
            </Button>
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
          {visibleEntries.map(({ entry, references }) => (
            <JournalPreviewCard
              key={entry.id}
              entry={entry}
              references={references}
              data={data}
              readerOpen={readerOpen}
              onRead={(event) => {
                returnFocus.current = event.currentTarget;
                setSelectedId(entry.id);
                setReaderOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <PageEmptyState
          data-journal-empty
          icon={<BookOpenText strokeWidth={1.75} />}
          title={
            search
              ? "No page found that thought"
              : "A page will find its way here"
          }
        >
          {search
            ? "Try another word, a date or a shorter phrase. Your saved pages are still right here."
            : "Write a little longer in any check-in. Once your saved writing passes 100 words, it has a place here too."}
        </PageEmptyState>
      )}

      {filtered.length > limit && (
        <Button
          variant="default"
          size="sm"
          type="button"
          className={`${styles.loadMore} h-auto`}
          onClick={() => setLimit((previous) => previous + PAGE_SIZE)}
          data-journal-load-more
        >
          <ArrowDown aria-hidden="true" size={15} /> More pages
        </Button>
      )}
      {entries.length > 0 && (
        <p className={styles.footnote}>
          Saved writing with more than 100 words appears here. Shorter notes and
          unfinished drafts stay with their daily check-in.
        </p>
      )}
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
