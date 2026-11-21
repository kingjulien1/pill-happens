"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Info } from "lucide-react";
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
import type { DailyCheckInPeriod } from "@/lib/daily-check-in";
import { MarkdownMark } from "./markdown-mark";
import styles from "./daily-reflection-editor.module.css";
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
      className={styles.editor}
      aria-label={`${period === "morning" ? "Morning" : "Evening"} journal writing`}
      data-journal-card
      data-journal-period={period}
      data-journal-active="false"
    >
      <p className={styles.snapshot} data-journal-snapshot>
        {snapshotTitle} {snapshotDetail}
      </p>
      <p
        className={`${styles.guidance} ${styles.introduction}`}
        data-journal-introduction
      >
        <Info size={20} aria-hidden="true" />
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
                  <MarkdownMark size={21} aria-hidden="true" />
                  <span>{hasWriting ? "Keep Writing" : "Start Writing"}</span>
                </span>
                <span className="intake-primary-dot" aria-hidden="true">
                  ·
                </span>
                <span className="intake-primary-aside">Pen it!</span>
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
