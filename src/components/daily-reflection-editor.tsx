"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenText,
  Check,
  Copy,
  LibraryBig,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/journal-toast";

import {
  ReflectionDialog,
  type ReflectionDraftStatus,
} from "@/components/reflection-dialog";
import type { ReflectionSaveControls } from "@/components/use-reflection-save";
import { ReflectionReaderDialog } from "@/components/reflection-reader-dialog";
import { ActionIcon } from "./action-icon";
import { getIntakeActionThemeStyle } from "@/lib/action-button-system";
import { TodayActionButton } from "@/components/today-action-button";

import { rememberJournalDestination } from "@/components/journal-drafts";
import { useJournal } from "@/components/journal-provider";
import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";
import { reflectionStats } from "@/lib/reflection-writing";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import { MarkdownMark } from "./markdown-mark";
import { MorningCoffee } from "./morning-coffee";
import styles from "./daily-reflection-editor.module.css";
import closeStyles from "./dialog-close.module.css";
import { Button } from "@/components/ui/button";

const numberFormat = new Intl.NumberFormat("en-GB");
/** A compact doorway into the same persistent check-in draft. */
export function DailyReflectionEditor({
  id,
  value,
  onChange,
  disabled,
  day,
  period = "evening",
  open,
  onOpenChange,
  draftStatus,
  savedAt,
  saving,
  onLibraryNavigate,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  day: string;
  period?: DailyCheckInPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftStatus?: ReflectionDraftStatus;
  savedAt?: string;
  saving: ReflectionSaveControls;
  onLibraryNavigate?: () => void;
}) {
  const editor = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const readerTrigger = useRef<HTMLButtonElement>(null);
  const [reading, setReading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFinished, setRefreshFinished] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const refreshPending = useRef(false);
  const refreshToast = useRef<string | number | null>(null);
  const refreshReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const {
    refresh,
    error: journalError,
    busy,
    notificationScope,
  } = useJournal();
  const stats = useMemo(() => reflectionStats(value), [value]);
  const hasWriting = Boolean(value.trim());
  const refreshLocked =
    disabled || busy || saving.status === "saving" || refreshing;
  const refreshError = Boolean(journalError) || refreshFailed;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (refreshReset.current) clearTimeout(refreshReset.current);
      if (refreshToast.current !== null) toast.dismiss(refreshToast.current);
    };
  }, []);

  // Ambient decoration follows visibility/readiness; writing and reading stay still.
  useEffect(() => {
    const node = editor.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      node.dataset.journalActive = String(
        visible &&
          !document.hidden &&
          !reduced.matches &&
          getPageEntryReadiness() &&
          !open &&
          !reading,
      );
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              visible = entries.at(-1)?.isIntersecting ?? false;
              sync();
            },
            { threshold: 0.01 },
          );
    if (observer) observer.observe(node);
    else visible = true;
    const unsubscribe = subscribePageEntryReadiness(sync);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      observer?.disconnect();
      unsubscribe();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      node.dataset.journalActive = "false";
    };
  }, [open, reading]);

  // Provider.refresh resolves after updating its error state, including on failure.
  // Use the committed result rather than claiming success from Promise<void>.
  useEffect(() => {
    if (!refreshFinished || refreshToast.current === null) return;
    const toastId = refreshToast.current;
    refreshToast.current = null;
    if (refreshError)
      toast.error("Couldn't refresh your journal. Your writing is unchanged.", {
        journalScope: notificationScope,
        id: toastId,
        heading: "Refresh unsuccessful",
        details: {
          paragraphs: [
            "The latest saved journal could not be loaded. Your current writing has not been replaced. Check your connection, then use Refresh Journal to try again.",
          ],
          links: [{ label: "Drafts and saving", href: "/guide#daily-log" }],
          footer:
            "Refreshing reads saved records; it does not submit the check-in form.",
        },
      });
    else
      toast.success(
        "Journal refreshed. Your writing is right where you left it.",
        {
          journalScope: notificationScope,
          id: toastId,
          heading: "Journal refreshed",
          details: {
            paragraphs: [
              "The latest saved records have been loaded. Your current writing stays in the editor, ready for you to continue.",
            ],
            links: [
              { label: "Browse your journals", href: "/journal" },
              { label: "Drafts and saving", href: "/guide#daily-log" },
            ],
            footer:
              "Use the writing editor’s save status to check whether your latest words have been saved.",
          },
        },
      );
  }, [refreshFinished, refreshError, notificationScope]);

  const refreshJournal = async () => {
    if (refreshLocked || refreshPending.current) return;
    refreshPending.current = true;
    if (refreshReset.current) clearTimeout(refreshReset.current);
    setRefreshing(true);
    setRefreshFinished(false);
    setRefreshFailed(false);
    refreshToast.current = toast.loading("Refreshing your journal…", {
      journalScope: notificationScope,
      persistence: false,
      heading: "Checking for updates",
      details: {
        paragraphs: [
          "Loading the latest saved records. Your writing stays in place while the journal checks for updates.",
        ],
        footer: "This refresh does not submit the check-in form.",
      },
    });
    try {
      await refresh();
    } catch {
      if (mounted.current) setRefreshFailed(true);
    } finally {
      refreshPending.current = false;
      if (mounted.current) {
        setRefreshing(false);
        setRefreshFinished(true);
        refreshReset.current = setTimeout(() => {
          setRefreshFinished(false);
          setRefreshFailed(false);
        }, 2_400);
      }
    }
  };

  const snapshotTitle = !hasWriting
    ? "A fresh page, at your pace."
    : saving.status === "saved"
      ? "Your words, kept together."
      : saving.status === "saving"
        ? "Your page is catching up."
        : "A little space for what's on your mind.";
  const snapshotDetail = !hasWriting
    ? "A few words or a whole chapter. There's room for both."
    : draftStatus === "error" || draftStatus === "memory"
      ? "These edits are in this open page. Keep it open until they're saved."
      : saving.message;
  const refreshLabel = refreshing
    ? "Refreshing journal"
    : refreshFinished
      ? refreshError
        ? "Refresh failed. Try again"
        : "Journal refreshed"
      : "Refresh journal";

  return (
    <section
      ref={editor}
      className={styles.editor}
      aria-labelledby={`${id}-heading`}
      data-journal-card
      data-journal-period={period}
      data-journal-active="false"
    >
      <div className={styles.headingRow}>
        <div className={styles.headingGroup}>
          <MorningCoffee className={styles.writingCoffee} />
          <div className={styles.headingCopy}>
            <h3 id={`${id}-heading`} className={styles.heading}>
              {period === "morning"
                ? "Your Morning, Your Words"
                : "Your Day, Your Words"}
            </h3>
            <p className={styles.subtitle}>Room to reflect.</p>
          </div>
        </div>
        <div className={closeStyles.actions}>
          <Button
            variant="ghost"
            size="icon"
            ref={readerTrigger}
            type="button"
            rim={false}
            className={closeStyles.control}
            aria-label="Read journal"
            title="Read this journal page"
            disabled={!hasWriting}
            onClick={() => setReading(true)}
            data-journal-read
          >
            <BookOpenText size={19} strokeWidth={2.6} aria-hidden="true" />
          </Button>
          <Button
            navigation
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={
              <Link
                href="/journal"
                onNavigate={() => {
                  onLibraryNavigate?.();
                  rememberJournalDestination("/journal");
                }}
              />
            }
            rim={false}
            className={closeStyles.control}
            aria-label="Open journal library"
            title="Open journal library"
            data-journal-library
          >
            <LibraryBig size={19} strokeWidth={2.6} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <hr className={styles.divider} />
      <div data-journal-snapshot>
        <p className={styles.snapshotTitle}>{snapshotTitle}</p>
        <p className={styles.snapshotDetail}>{snapshotDetail}</p>
      </div>
      <p
        className={`${styles.guidance} ${styles.introduction}`}
        data-journal-introduction
      >
        <MarkdownMark size={24} aria-hidden="true" />
        <span>
          Use headings, lists and Markdown to give a longer entry some shape.
          Closing the writing space brings you back to this check-in with your
          draft.
        </span>
      </p>
      <ReflectionDialog
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        day={day}
        period={period}
        open={open}
        onOpenChange={onOpenChange}
        draftStatus={draftStatus}
        savedAt={savedAt}
        saving={saving}
        stats={stats}
        launcherRef={launcher}
        launcher={
          <TodayActionButton
            ref={launcher}
            type="button"
            data-intake-paint="satin"
            className="intake-primary-cta w-full"
            disabled={disabled}
            style={{
              ...getIntakeActionThemeStyle(),
              height: 72,
              minHeight: 72,
            }}
            data-journal-write
          >
            <span className="intake-primary-row">
              <span className="intake-primary-copy">
                <span className="intake-primary-label">
                  <PencilLine size={21} strokeWidth={2.3} aria-hidden="true" />
                  <span>
                    {hasWriting ? "Continue Writing" : "Start Writing"}
                  </span>
                </span>
              </span>
              <ActionIcon name="next" className="intake-primary-next" />
            </span>
          </TodayActionButton>
        }
      />
      <p className={styles.guidance} data-journal-guidance>
        You can reopen your draft to keep writing. Use Save Check-In to keep the
        rest of your answers with this day.
      </p>
      <hr className={styles.divider} />
      <div className={styles.captionRow}>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={`${styles.iconButton} ${styles.refresh}`}
          disabled={!hasWriting}
          aria-label="Copy writing"
          title="Copy your writing"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              toast.success("Writing copied.", {
                journalScope: notificationScope,
              });
            } catch {
              toast.error(
                "Clipboard unavailable. Open the editor to select and copy your writing.",
                { journalScope: notificationScope },
              );
            }
          }}
        >
          <Copy size={14} aria-hidden="true" />
        </Button>
        <div
          className={styles.stats}
          aria-label="Reflection statistics"
          data-journal-stats
        >
          <div className={styles.stat} data-journal-stat="words">
            <strong>{numberFormat.format(stats.words)}</strong>
            <span>{stats.words === 1 ? "word" : "words"}</span>
          </div>
          <div className={styles.stat} data-journal-stat="characters">
            <strong>{numberFormat.format(stats.characters)}</strong>
            <span>characters</span>
          </div>
          <div className={styles.stat} data-journal-stat="reading">
            <strong>
              {stats.readingMinutes ? `~${stats.readingMinutes}` : "—"}
            </strong>
            <span>min read</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={`${styles.iconButton} ${styles.refresh}`}
          onClick={() => void refreshJournal()}
          disabled={refreshLocked}
          aria-label={refreshLabel}
          title={`${refreshLabel} · keeps your current writing`}
          aria-busy={refreshing}
          data-journal-refresh
          data-refresh-state={
            refreshing
              ? "pending"
              : refreshFinished
                ? refreshError
                  ? "error"
                  : "success"
                : "idle"
          }
        >
          {refreshFinished && !refreshError ? (
            <Check size={14} strokeWidth={2.3} aria-hidden="true" />
          ) : (
            <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
          )}
        </Button>
      </div>
      <ReflectionReaderDialog
        open={reading}
        onOpenChange={setReading}
        value={value}
        day={day}
        onEdit={() => onOpenChange(true)}
        returnFocus={readerTrigger}
      />
    </section>
  );
}
