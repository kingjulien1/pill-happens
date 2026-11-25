"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Feather,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/journal-toast";

import {
  ReflectionDialog,
  type ReflectionDraftStatus,
} from "@/components/reflection-dialog";
import type { ReflectionSaveControls } from "@/components/use-reflection-save";
import { ActionIcon } from "./action-icon";
import { getIntakeActionThemeStyle } from "@/lib/action-button-system";
import { TodayActionButton } from "@/components/today-action-button";

import { useJournal } from "@/components/journal-provider";
import { reflectionStats } from "@/lib/reflection-writing";
import { JOURNAL_LIBRARY_MIN_WORDS } from "@/lib/journal-library";
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import { MarkdownMark } from "./markdown-mark";
import styles from "./daily-reflection-editor.module.css";
import { Button } from "@/components/ui/button";

const numberFormat = new Intl.NumberFormat("en-GB");
const starters = [
  "What’s one small thing you’d like to remember about today?",
  "What’s taking up more room in your head than it pays rent for?",
  "Which detail would a photo of today miss?",
  "Who or what made something a little easier?",
  "What deserves a second try with slightly better instructions?",
  "What would you tell a friend about today that you’d leave off a to-do list?",
  "If today came with a footnote, what would it say?",
];

function JournalPageCue({
  day,
  stats,
  disabled,
}: {
  day: string;
  stats: ReturnType<typeof reflectionStats>;
  disabled: boolean;
}) {
  const [promptIndex, setPromptIndex] = useState(
    () => Number(day.slice(-2)) % starters.length,
  );
  const [showOpening, setShowOpening] = useState(false);
  const hasOpening = Boolean(stats.excerpt);
  const CueIcon = hasOpening ? BookOpenText : Feather;
  const ControlIcon = hasOpening ? (showOpening ? EyeOff : Eye) : Dices;
  const passage = useId();

  return (
    <div className={styles.cue} data-journal-snapshot>
      <div className={styles.cueRow}>
        <strong className={styles.cueTitle}>
          <CueIcon size={18} aria-hidden="true" />
          {hasOpening ? "Your page so far" : "A way in"}
        </strong>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={styles.cueButton}
          disabled={disabled}
          aria-controls={hasOpening ? passage : undefined}
          aria-expanded={hasOpening ? showOpening : undefined}
          onClick={() => {
            if (hasOpening) setShowOpening((shown) => !shown);
            else setPromptIndex((index) => (index + 1) % starters.length);
          }}
        >
          <ControlIcon size={13} aria-hidden="true" />
          {hasOpening
            ? showOpening
              ? "Hide opening"
              : "Peek at opening"
            : "New prompt"}
        </Button>
      </div>
      <div className={styles.cueText}>
        {hasOpening ? (
          <>
            <p hidden={showOpening}>
              {stats.words > JOURNAL_LIBRARY_MIN_WORDS
                ? "Once saved, a page this length appears in your journal library as well as on its tracking day."
                : `Short entries live on their tracking day. The library also lists saved pages over ${JOURNAL_LIBRARY_MIN_WORDS} words.`}
            </p>
            <blockquote id={passage} hidden={!showOpening}>
              {showOpening && stats.excerpt}
            </blockquote>
          </>
        ) : (
          <p aria-live="polite">{starters[promptIndex]}</p>
        )}
      </div>
    </div>
  );
}

/** Both check-ins use this same body and the same daily writing draft. */
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
}) {
  const launcher = useRef<HTMLButtonElement>(null);
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

  // Provider.refresh resolves after updating its error state, including on failure.
  // Use the committed result rather than claiming success from Promise<void>.
  useEffect(() => {
    if (!refreshFinished || refreshToast.current === null) return;
    const toastId = refreshToast.current;
    refreshToast.current = null;
    if (refreshError)
      toast.error("Saved records could not be loaded · Current writing kept", {
        journalScope: notificationScope,
        id: toastId,
        heading: "Refresh not confirmed.",
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
      toast.success("Latest saved records loaded · Current writing kept", {
        journalScope: notificationScope,
        id: toastId,
        heading: "Journal refreshed.",
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
      });
  }, [refreshFinished, refreshError, notificationScope]);

  const refreshJournal = async () => {
    if (refreshLocked || refreshPending.current) return;
    refreshPending.current = true;
    if (refreshReset.current) clearTimeout(refreshReset.current);
    setRefreshing(true);
    setRefreshFinished(false);
    setRefreshFailed(false);
    refreshToast.current = toast.loading(
      "Loading saved records · Your editor stays in place",
      {
        journalScope: notificationScope,
        persistence: false,
        heading: "Refreshing your journal…",
        details: {
          paragraphs: [
            "Loading the latest saved records. Your writing stays in place while the journal checks for updates.",
          ],
          footer: "This refresh does not submit the check-in form.",
        },
      },
    );
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

  const writingHint =
    !hasWriting && !savedAt
      ? "In the editor, type @ to link a medication or / to link a day."
      : (draftStatus === "error" || draftStatus === "memory") &&
          saving.status !== "saved"
        ? "Keep this window open until your writing syncs."
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
      className={styles.editor}
      aria-label="Daily journal writing"
      data-journal-card
      data-journal-period={period}
      data-journal-active="false"
    >
      <JournalPageCue
        key={stats.excerpt ? `opening:${day}` : day}
        day={day}
        stats={stats}
        disabled={disabled}
      />
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
                  <MarkdownMark size={21} aria-hidden="true" />
                  <span>{hasWriting ? "Keep Writing" : "Start Writing"}</span>
                </span>
                <span className="intake-primary-dot" aria-hidden="true">
                  ·
                </span>
                <span className="intake-primary-aside">Pen it</span>
              </span>
              <ActionIcon name="next" className="intake-primary-next" />
            </span>
          </TodayActionButton>
        }
      />
      <p className={styles.guidance} data-journal-guidance>
        {writingHint} Save Check-In keeps your other answers.
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
              toast.success(
                `${stats.words} words · ${stats.characters} characters on your clipboard`,
                {
                  journalScope: notificationScope,
                  heading: "Writing copied.",
                  details: {
                    paragraphs: [
                      "Paste the copied text wherever you need it. Copying does not change your entry or its save status.",
                    ],
                  },
                },
              );
            } catch {
              toast.error("Open the editor to select and copy your writing.", {
                journalScope: notificationScope,
                heading: "Clipboard unavailable.",
                details: {
                  paragraphs: [
                    "This browser could not write to the clipboard. You can still open the writing editor, select the text and copy it yourself.",
                  ],
                },
              });
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
          <span aria-hidden="true">·</span>
          <div className={styles.stat} data-journal-stat="characters">
            <strong>{numberFormat.format(stats.characters)}</strong>
            <span>characters</span>
          </div>
          <span aria-hidden="true">·</span>
          <div className={styles.stat} data-journal-stat="reading">
            <strong>
              {stats.readingMinutes ? `~${stats.readingMinutes}` : "0"}
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
    </section>
  );
}
