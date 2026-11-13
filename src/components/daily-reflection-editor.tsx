"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Check,
  LibraryBig,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/journal-toast";
import { ScribbleLoopIcon } from "@phosphor-icons/react/dist/ssr/ScribbleLoop";
import {
  ReflectionDialog,
  type ReflectionDraftStatus,
} from "@/components/reflection-dialog";
import type { ReflectionSaveControls } from "@/components/use-reflection-save";
import { ReflectionReaderDialog } from "@/components/reflection-reader-dialog";
import { SecondaryButton } from "@/components/secondary-button";
import { AccentButtonSurface } from "@/components/accent-button";
import { getJournalSymbolPaintStyle } from "@/lib/action-button-system";
import { rememberJournalDestination } from "@/components/journal-drafts";
import { useJournal } from "@/components/journal-provider";
import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";
import { reflectionStats } from "@/lib/reflection-writing";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import styles from "./daily-reflection-editor.module.css";

const numberFormat = new Intl.NumberFormat("en-GB");
const symbolPaint = getJournalSymbolPaintStyle();
const launcherPaint = { "--action-base-height": "56px" } as CSSProperties;

/** A small mug with separate, staggered steam paths; motion follows the doorway. */
function MorningCoffee() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.coffee}
      aria-hidden="true"
      focusable="false"
      data-journal-coffee
    >
      <g className={styles.coffeeMug}>
        <path d="M7.5 15.5h14v5.3a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" />
        <path d="M21.5 16.5H23a3.5 3.5 0 0 1 0 7h-2.1M6.5 29h17" />
      </g>
      <g className={styles.coffeeSteam} data-journal-coffee-steam>
        <path d="M9 12c-2-1.7 2-3.1 0-4.8S7.2 4.7 9 3" />
        <path d="M15 12c-2-1.7 2-3.1 0-4.8S13.2 4.7 15 3" />
        <path d="M21 12c-2-1.7 2-3.1 0-4.8S19.2 4.7 21 3" />
      </g>
    </svg>
  );
}

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
  const { refresh, error: journalError, busy } = useJournal();
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
        id: toastId,
        heading: "Refresh unsuccessful",
      });
    else
      toast.success(
        "Journal refreshed. Your writing is right where you left it.",
        { id: toastId, heading: "Journal refreshed" },
      );
  }, [refreshFinished, refreshError]);

  const refreshJournal = async () => {
    if (refreshLocked || refreshPending.current) return;
    refreshPending.current = true;
    if (refreshReset.current) clearTimeout(refreshReset.current);
    setRefreshing(true);
    setRefreshFinished(false);
    setRefreshFailed(false);
    refreshToast.current = toast.loading("Refreshing your journal…", {
      heading: "Checking for updates",
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
      <span className={styles.ambient} aria-hidden="true" />
      <div className={styles.headingRow}>
        <div className={styles.headingGroup}>
          <span
            className={styles.headingIcon}
            style={symbolPaint}
            aria-hidden="true"
            data-journal-symbol
          >
            <AccentButtonSurface
              className={styles.iconSurface}
              data-journal-icon-surface
            />
            <span
              className={`${styles.iconGlyph} ${period === "morning" ? styles.coffeeGlyph : ""}`}
              data-journal-icon-glyph
            >
              {period === "morning" ? (
                <MorningCoffee />
              ) : (
                <ScribbleLoopIcon size={29} weight="bold" />
              )}
            </span>
          </span>
          <div className={styles.headingCopy}>
            <h3 id={`${id}-heading`} className={styles.heading}>
              {period === "morning"
                ? "Your Morning, Your Words"
                : "Your Day, Your Words"}
            </h3>
            <p className={styles.subtitle}>Room to reflect.</p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button
            ref={readerTrigger}
            type="button"
            className={styles.iconButton}
            aria-label="Read journal"
            title="Read this journal page"
            disabled={!hasWriting}
            onClick={() => setReading(true)}
            data-journal-read
          >
            <BookOpenText size={19} strokeWidth={2.6} aria-hidden="true" />
          </button>
          <Link
            href="/journal"
            className={styles.iconButton}
            aria-label="Open journal library"
            title="Open journal library"
            onNavigate={() => {
              onLibraryNavigate?.();
              rememberJournalDestination("/journal");
            }}
            data-journal-library
          >
            <LibraryBig size={19} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className={styles.snapshot} data-journal-snapshot>
        <p className={styles.snapshotTitle}>{snapshotTitle}</p>
        <p className={styles.snapshotDetail}>{snapshotDetail}</p>
        <p
          className={`${styles.guidance} ${styles.introduction}`}
          data-journal-introduction
        >
          Use headings, lists and Markdown to give a longer entry some shape.
          Closing the writing space brings you back to this check-in with your
          draft.
        </p>
      </div>
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
          <SecondaryButton
            ref={launcher}
            type="button"
            radius={18}
            surface="accent"
            className={styles.launcher}
            disabled={disabled}
            style={launcherPaint}
            data-journal-write
          >
            <span className={styles.launcherLabel}>
              <PencilLine size={21} strokeWidth={2.3} aria-hidden="true" />
              <span>{hasWriting ? "Continue Writing" : "Start Writing"}</span>
            </span>
            <ArrowUpRight size={21} strokeWidth={2.3} aria-hidden="true" />
          </SecondaryButton>
        }
      />
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
      <p className={styles.guidance} data-journal-guidance>
        The book icon opens a clean reading view. Saved entries over 100 words
        join Journal automatically. Use Save Check-In to keep the rest of your
        answers with this day.
      </p>
      <div className={styles.captionRow}>
        <p className={styles.structure}>
          <span>
            {numberFormat.format(stats.paragraphs)}{" "}
            {stats.paragraphs === 1 ? "paragraph" : "paragraphs"}
          </span>
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <span>
            {numberFormat.format(stats.headings)}{" "}
            {stats.headings === 1 ? "heading" : "headings"}
          </span>
        </p>
        <button
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
        </button>
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
