"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { Toolbar } from "@base-ui/react/toolbar";
import {
  ArrowUpRight,
  Bold,
  Code,
  Columns2,
  CloudBackup,
  CloudAlert,
  CloudCheck,
  HardDrive,
  FileDown,
  Bookmark,
  BookmarkCheck,
  Eye,
  Pencil,
  Info,
  Check,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  PencilLine,
  Quote,
  Strikethrough,
  Sparkle,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import closeStyles from "./dialog-close.module.css";
import { useDialogScrollMemory } from "@/components/use-dialog-scroll-memory";
import type { ReflectionSaveControls } from "@/components/use-reflection-save";
import { Textarea } from "@/components/ui/textarea";
import { useJournalMentionMenu } from "@/components/journal-mention-menu";
import { ReflectionWritingHelp } from "@/components/reflection-writing-help";
import { ReflectionMarkdown } from "@/components/reflection-markdown";
import {
  DAILY_REFLECTION_MAX_LENGTH,
  type DailyCheckInPeriod,
} from "@/lib/daily-check-in";
import { checkInDraftKey } from "@/lib/check-in-draft";
import { formatDay } from "@/lib/domain";
import {
  applyMarkdownFormat,
  buildMarkdownFormatRanges,
  activeMarkdownFormats,
  type reflectionStats,
} from "@/lib/reflection-writing";
import styles from "./reflection-dialog.module.css";

export type ReflectionDraftStatus = "saved" | "memory" | "error";
type WritingMode = "write" | "preview" | "split";
type CompletionPhase =
  "idle" | "enter" | "hold" | "exit" | "depart" | "reduced" | "closed";
// The center holds for exactly 700ms. The editor leaves halfway through its retreat.
const completionTiming = {
  enter: 800,
  hold: 700,
  retreatLead: 260,
  depart: 420,
};
const celebrationSparks = Array.from({ length: 8 }, (_, index) => index);
type FormatKind = Parameters<typeof applyMarkdownFormat>[3];
const numberFormat = new Intl.NumberFormat("en-GB");
const splitQuery = "(min-width: 900px)";
const subscribeSplit = (listener: () => void) => {
  const query = window.matchMedia(splitQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const splitSnapshot = () => window.matchMedia(splitQuery).matches;
const splitServerSnapshot = () => false;
const formats = [
  { kind: "bold", label: "Bold", icon: Bold },
  { kind: "italic", label: "Italic", icon: Italic },
  { kind: "strike", label: "Strikethrough", icon: Strikethrough },
  { kind: "heading", label: "Heading", icon: Heading2 },
  { kind: "bullet", label: "Bulleted list", icon: List },
  { kind: "numbered", label: "Numbered list", icon: ListOrdered },
  { kind: "task", label: "Task list", icon: ListTodo },
  { kind: "quote", label: "Block quote", icon: Quote },
  { kind: "link", label: "Link", icon: LinkIcon },
  { kind: "code", label: "Code", icon: Code },
  { kind: "rule", label: "Divider", icon: Minus },
] as const satisfies readonly {
  kind: FormatKind;
  label: string;
  icon: typeof Bold;
}[];
function draftLabel(status?: ReflectionDraftStatus) {
  if (status === "saved") return "Draft saved on this device";
  if (status === "memory") return "Draft kept for this visit";
  if (status === "error") return "Device draft could not be saved";
  return "Part of your check-in draft";
}

export function ReflectionDialog({
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
  stats,
  launcherRef,
  launcherClassName,
  launcher,
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
  stats: ReturnType<typeof reflectionStats>;
  launcherRef: RefObject<HTMLButtonElement | null>;
  launcherClassName?: string;
  /** A complete button with its own content and the supplied launcherRef. */
  launcher?: ReactElement;
  saving: ReflectionSaveControls;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const dialogNode = useRef<HTMLDivElement | null>(null);
  const [dialogRevision, setDialogRevision] = useState(0);
  const setDialogNode = useCallback((node: HTMLDivElement | null) => {
    if (dialogNode.current === node) return;
    dialogNode.current = node;
    setDialogRevision((revision) => revision + 1);
  }, []);
  const [caret, setCaret] = useState({ start: 0, end: 0 });
  const [formatPulse, setFormatPulse] = useState({ kind: "", revision: 0 });
  const [modeRevision, setModeRevision] = useState(0);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const previousSave = useRef({
    status: saving.status,
    scope: `${day}:${period}`,
  });
  const title = useRef<HTMLHeadingElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const pendingSelection = useRef<{
    value: string;
    start: number;
    end: number;
    activatedFrom: Element | null;
  } | null>(null);
  const completing = useRef(false);
  const session = useRef({ open, day, period, generation: 0 });
  const [completionPhase, setCompletionPhase] =
    useState<CompletionPhase>("idle");
  const finishing = completionPhase !== "idle" && completionPhase !== "closed";
  const [mode, setMode] = useState<WritingMode>("write");
  const [help, setHelp] = useState(false);
  const helpButton = useRef<HTMLButtonElement>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "preparing" | "downloading" | "complete" | "error"
  >("idle");
  const downloadPending = useRef(false);
  const downloadRevision = useRef(0);
  const downloadTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const downloadUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [feedback, setFeedback] = useState("");
  const wide = useSyncExternalStore(
    subscribeSplit,
    splitSnapshot,
    splitServerSnapshot,
  );
  const view = mode === "split" && !wide ? "write" : mode;
  const deferredValue = useDeferredValue(value);
  const formatRanges = useMemo(() => buildMarkdownFormatRanges(value), [value]);
  const activeFormats = useMemo(
    () => activeMarkdownFormats(formatRanges, caret.start, caret.end),
    [formatRanges, caret],
  );
  const saveVisual =
    saving.status === "saving"
      ? "saving"
      : saveConfirmed
        ? "confirmed"
        : ["error", "offline", "conflict", "review", "cooldown"].includes(
              saving.status,
            )
          ? "attention"
          : "idle";
  useEffect(() => {
    const scope = `${day}:${period}`;
    const changedScope = previousSave.current.scope !== scope;
    const confirmed =
      !changedScope &&
      previousSave.current.status === "saving" &&
      saving.status === "saved";
    previousSave.current = { status: saving.status, scope };
    if (!confirmed) {
      if (changedScope || saving.status !== "saved") setSaveConfirmed(false);
      return;
    }
    setSaveConfirmed(true);
    const timer = setTimeout(() => setSaveConfirmed(false), 1500);
    return () => clearTimeout(timer);
  }, [saving.status, day, period]);
  useLayoutEffect(() => {
    const node = dialogNode.current;
    if (!open || !node) return;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let frame = 0;
    let baselineHeight = window.innerHeight;
    let keyboardSession = document.activeElement === input.current;
    let keyboardReduced = false;
    let keyboardDismissed = false;
    let lastUnzoomedReduction = false;
    const sync = () => {
      frame = 0;
      const height = viewport?.height ?? window.innerHeight;
      const focused = document.activeElement === input.current;
      const unzoomed = Math.abs((viewport?.scale ?? 1) - 1) < 0.05;
      if (!keyboardSession)
        baselineHeight = Math.max(window.innerHeight, height);
      if (unzoomed) lastUnzoomedReduction = baselineHeight - height >= 120;
      const reduced = lastUnzoomedReduction;
      if (keyboardSession && reduced) keyboardReduced = true;
      if (keyboardReduced && unzoomed && !reduced) keyboardDismissed = true;
      const keyboard =
        mobile.matches &&
        keyboardSession &&
        ((focused && !keyboardDismissed) || reduced);
      node.dataset.writingKeyboard = String(keyboard);
      if (!focused && unzoomed && !reduced) {
        keyboardSession = false;
        keyboardReduced = false;
        keyboardDismissed = false;
      }
      node.style.setProperty("--writer-visible-height", `${height}px`);
      node.style.setProperty(
        "--writer-visible-top",
        `${Math.max(0, viewport?.offsetTop ?? 0)}px`,
      );
      node.dataset.shortViewport = String(mobile.matches && height < 500);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    const startWriting = (event: Event) => {
      if (event.target === input.current) {
        if (!keyboardSession)
          baselineHeight = Math.max(window.innerHeight, viewport?.height ?? 0);
        keyboardSession = true;
        keyboardReduced = false;
        keyboardDismissed = false;
      }
      schedule();
    };
    sync();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    mobile.addEventListener("change", schedule);
    node.addEventListener("focusin", startWriting);
    node.addEventListener("focusout", schedule);
    node.addEventListener("pointerdown", startWriting);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mobile.removeEventListener("change", schedule);
      node.removeEventListener("focusin", startWriting);
      node.removeEventListener("focusout", schedule);
      node.removeEventListener("pointerdown", startWriting);
    };
  }, [open, dialogRevision]);
  useEffect(
    () => () => {
      downloadRevision.current++;
      downloadPending.current = false;
      for (const timer of downloadTimers.current) clearTimeout(timer);
      downloadTimers.current.clear();
    },
    [open, day, period],
  );
  useEffect(() => {
    const urls = downloadUrls.current;
    return () => {
      for (const [url, timer] of urls) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);
  const { setScrollElement: setWritingElement, save: saveWritingScroll } =
    useDialogScrollMemory<HTMLTextAreaElement>({
      open: open && view !== "preview",
      scrollKey: `${checkInDraftKey(day, period)}:writing-source`,
      layout: view,
    });
  const { setScrollElement: setPreviewElement, save: savePreviewScroll } =
    useDialogScrollMemory<HTMLDivElement>({
      open: open && view !== "write",
      scrollKey: `${checkInDraftKey(day, period)}:writing-preview`,
      layout: view,
    });
  useLayoutEffect(() => {
    const previous = session.current;
    const reset =
      open &&
      (!previous.open || day !== previous.day || period !== previous.period);
    session.current = {
      open,
      day,
      period,
      generation: previous.generation + 1,
    };
    if (reset) {
      completing.current = false;
      // A reused writer must unlock before paint; retaining "closed" is only for its outgoing popup.
      setCompletionPhase("idle");
      setHelp(false);
      setDownloadState("idle");
    }
  }, [open, day, period]);
  const changeOpen: NonNullable<
    Parameters<typeof Dialog>[0]["onOpenChange"]
  > = (next, details) => {
    if (!next && completing.current) {
      details.cancel();
      return;
    }
    if (next) {
      completing.current = false;
      setCompletionPhase("idle");
    }
    if (!next) {
      saveWritingScroll();
      savePreviewScroll();
    }
    onOpenChange(next);
  };
  const finishCompletion = useEffectEvent(() => {
    // Done returns to the existing draft; it never submits or clears a check-in.
    saveWritingScroll();
    savePreviewScroll();
    setCompletionPhase("closed");
    onOpenChange(false);
  });
  useEffect(() => {
    if (!open || !finishing || !completing.current) return;
    let live = true;
    const generation = session.current.generation;
    const current = () => live && generation === session.current.generation;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const schedule = (delay: number, action: () => void) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (current()) action();
      }, delay);
      timers.add(timer);
    };
    const finish = () => {
      if (!current()) return;
      live = false;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      finishCompletion();
    };
    const visibility = () => {
      if (document.hidden) finish();
    };
    const motion = () => {
      if (reduced.matches) finish();
    };
    if (document.hidden) {
      schedule(0, finish);
    } else if (reduced.matches) {
      schedule(180, finish);
    } else {
      const retreat = completionTiming.enter + completionTiming.hold;
      schedule(completionTiming.enter, () => setCompletionPhase("hold"));
      schedule(retreat, () => setCompletionPhase("exit"));
      schedule(retreat + completionTiming.retreatLead, () =>
        setCompletionPhase("depart"),
      );
      schedule(
        retreat + completionTiming.retreatLead + completionTiming.depart,
        finish,
      );
    }
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", motion);
    return () => {
      live = false;
      completing.current = false;
      for (const timer of timers) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", motion);
    };
  }, [open, finishing, day, period]);
  const completeWriting = () => {
    if (!open || disabled || finishing || completing.current) return;
    completing.current = true;
    saveWritingScroll();
    savePreviewScroll();
    setCompletionPhase(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "reduced"
        : "enter",
    );
  };
  const changeMode = (next: WritingMode) => {
    saveWritingScroll();
    savePreviewScroll();
    setMode(next);
    setModeRevision((revision) => revision + 1);
  };
  const writingRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      input.current = node;
      setWritingElement(node);
    },
    [setWritingElement],
  );
  const canFormat = !disabled && !finishing && view !== "preview";
  const remaining = DAILY_REFLECTION_MAX_LENGTH - stats.characters;
  const SaveStateIcon =
    saving.status === "saved"
      ? CloudCheck
      : ["offline", "error", "conflict", "cooldown", "review"].includes(
            saving.status,
          )
        ? CloudAlert
        : CloudBackup;
  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) return;
    pendingSelection.current = null;
    const field = input.current;
    if (
      value !== pending.value ||
      !open ||
      view === "preview" ||
      !field?.isConnected ||
      field.closest("[hidden]") ||
      !field.closest("[data-reflection-dialog]")?.hasAttribute("data-open")
    )
      return;
    // Preserve later navigation while restoring the edit before another keypress.
    if (
      document.activeElement !== pending.activatedFrom &&
      document.activeElement !== field
    )
      return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(pending.start, pending.end);
    setCaret({ start: pending.start, end: pending.end });
  }, [value, open, view]);
  const rememberSelection = () => {
    if (!input.current) return;
    const next = {
      start: input.current.selectionStart,
      end: input.current.selectionEnd,
    };
    selection.current = next;
    setCaret((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  };
  const format = (kind: FormatKind) => {
    if (!canFormat) return;
    setFormatPulse((pulse) => ({ kind, revision: pulse.revision + 1 }));
    const activatedFrom = document.activeElement;
    rememberSelection();
    const next = applyMarkdownFormat(
      value,
      selection.current.start,
      selection.current.end,
      kind,
    );
    if (next.value.length > DAILY_REFLECTION_MAX_LENGTH) {
      setFeedback(
        "There is not enough space for this formatting. Shorten the entry first.",
      );
      return;
    }
    setFeedback("");
    selection.current = { start: next.selectionStart, end: next.selectionEnd };
    pendingSelection.current = {
      value: next.value,
      start: next.selectionStart,
      end: next.selectionEnd,
      activatedFrom,
    };
    onChange(next.value);
  };
  const mentions = useJournalMentionMenu({
    value,
    caret,
    field: input,
    enabled: open && canFormat && !help,
    scope: `${day}:${period}:${view}`,
    onCommit: (next) => {
      setFeedback("");
      selection.current = {
        start: next.selectionStart,
        end: next.selectionEnd,
      };
      pendingSelection.current = {
        value: next.value,
        start: next.selectionStart,
        end: next.selectionEnd,
        activatedFrom: document.activeElement,
      };
      onChange(next.value);
    },
    onFeedback: setFeedback,
  });

  const blurWritingInput = () => {
    if (document.activeElement !== input.current) return;
    rememberSelection();
    saveWritingScroll();
    input.current?.blur();
  };
  const download = () => {
    if (!value.trim() || downloadPending.current || finishing || disabled)
      return;
    for (const timer of downloadTimers.current) clearTimeout(timer);
    downloadTimers.current.clear();
    const revision = ++downloadRevision.current;
    const generation = session.current.generation;
    downloadPending.current = true;
    setDownloadState("preparing");
    const later = (delay: number, task: () => void) => {
      const timer = setTimeout(() => {
        downloadTimers.current.delete(timer);
        if (
          downloadRevision.current === revision &&
          session.current.open &&
          session.current.generation === generation
        )
          task();
      }, delay);
      downloadTimers.current.add(timer);
    };
    let url: string | null = null;
    try {
      // Keep the actual download inside the trusted click, including on Safari.
      url = URL.createObjectURL(
        new Blob([value], { type: "text/markdown;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reflection-${day}${period === "morning" ? "-morning" : ""}.md`;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
      }
      const exportedUrl = url;
      const revoke = setTimeout(() => {
        URL.revokeObjectURL(exportedUrl);
        downloadUrls.current.delete(exportedUrl);
      }, 1000);
      downloadUrls.current.set(exportedUrl, revoke);
      later(240, () => setDownloadState("downloading"));
      later(650, () => {
        downloadPending.current = false;
        setDownloadState("complete");
        setFeedback("Markdown file ready. Check your downloads.");
      });
      later(2100, () => setDownloadState("idle"));
    } catch {
      if (url) URL.revokeObjectURL(url);
      downloadPending.current = false;
      setDownloadState("error");
      setFeedback(
        "The file could not be prepared. Your writing is unchanged; try again.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      onOpenChangeComplete={(next) => {
        if (!next && !open) {
          completing.current = false;
          setCompletionPhase("idle");
        }
      }}
    >
      <DialogTrigger
        disabled={disabled}
        render={
          launcher ?? (
            <Button
              ref={launcherRef}
              type="button"
              variant="secondary"
              className={launcherClassName}
              disabled={disabled}
            />
          )
        }
      >
        {launcher ? null : (
          <>
            <PencilLine size={16} aria-hidden="true" />
            {value.trim() ? "Continue Writing" : "Open Writing Space"}
            <ArrowUpRight size={15} aria-hidden="true" />
          </>
        )}
      </DialogTrigger>
      <DialogContent
        ref={setDialogNode}
        id={`${id}-workspace`}
        className={styles.dialog}
        showCloseButton={false}
        finalFocus={launcherRef}
        initialFocus={(interaction) =>
          // Restored-open writers have no opening gesture. Focusing a textarea
          // then can reveal its reset caret and overwrite the remembered scroll.
          interaction === "" || interaction === "touch" || view === "preview"
            ? title.current
            : input.current
        }
        data-reflection-dialog
        data-reflection-period={period}
        data-reflection-mode={view}
        data-completion-phase={completionPhase}
      >
        <header className={styles.header} data-writing-header>
          <div className={styles.titleRow}>
            <p className={styles.context} data-writing-context>
              <time dateTime={day} data-writing-date>
                {formatDay(day, { weekday: "long", month: "short" })}
              </time>
              <span className={styles.contextSeparator} aria-hidden="true">
                ·
              </span>
              <span className={styles.periodLabel}>
                {period === "morning"
                  ? "Morning Reflection"
                  : "Evening Reflection"}
              </span>
            </p>
            <DialogClose
              disabled={finishing}
              render={
                <button
                  type="button"
                  className={closeStyles.control}
                  data-dialog-corner="control"
                  aria-label="Close writing space"
                />
              }
            >
              <X strokeWidth={2.2} aria-hidden="true" />
            </DialogClose>
          </div>
          <DialogTitle
            ref={title}
            tabIndex={-1}
            className={styles.title}
            data-writing-heading
          >
            {period === "morning"
              ? "Your Morning, Your Words"
              : "Your Day, Your Words"}
          </DialogTitle>
          <DialogDescription
            className={styles.description}
            data-writing-description
          >
            Write in Markdown and read it as a page. Give a passing thought a
            line, or let a longer story take its time. Headings, lists and
            emphasis help your words find their shape. Switch to preview
            whenever you want a quieter view. Your writing is kept in this
            check-in’s draft as you go. Save a fresh journal copy with the save
            icon, or let autosave catch the next pause. Mood, sleep and the rest
            of your check-in stay yours to finish when you’re ready.
          </DialogDescription>
        </header>
        <div
          className={styles.controls}
          inert={finishing || undefined}
          data-writing-tools
        >
          <div
            className={styles.actionsRow}
            onPointerDownCapture={blurWritingInput}
            onClickCapture={blurWritingInput}
            data-writing-actions
          >
            <div className={styles.actionGroup}>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={`${styles.iconControl} ${styles.modeControl}`}
                data-mode={view}
                aria-label={
                  view === "preview"
                    ? "Return to writing"
                    : "Show reading preview"
                }
                title={
                  view === "preview"
                    ? "Return to writing"
                    : "Show reading preview"
                }
                aria-pressed={view === "preview"}
                onClick={() =>
                  changeMode(view === "preview" ? "write" : "preview")
                }
                data-writing-toggle
              >
                <span
                  className={styles.modePulse}
                  data-pulse={
                    modeRevision
                      ? modeRevision % 2
                        ? "first"
                        : "second"
                      : undefined
                  }
                >
                  {view === "preview" ? (
                    <Eye
                      className={styles.controlGlyph}
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />
                  ) : (
                    <Pencil
                      className={styles.controlGlyph}
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Button>
              {wide && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className={styles.iconControl}
                  aria-label="Split writing and preview"
                  title="Split writing and preview"
                  aria-pressed={view === "split"}
                  onClick={() =>
                    changeMode(view === "split" ? "write" : "split")
                  }
                  data-writing-split
                >
                  <Columns2
                    className={styles.controlGlyph}
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={`${styles.iconControl} ${styles.saveControl}`}
                aria-label="Save reflection"
                title={saving.message}
                disabled={!saving.canSave || finishing}
                aria-busy={saving.status === "saving" || undefined}
                onClick={saving.onSave}
                data-writing-save
                data-save-visual={saveVisual}
                data-save-status={saving.status}
              >
                {saving.status === "saved" ? (
                  <BookmarkCheck
                    className={styles.saveGlyph}
                    strokeWidth={2.6}
                    aria-hidden="true"
                    data-writing-save-icon="saved"
                  />
                ) : (
                  <Bookmark
                    className={styles.saveGlyph}
                    strokeWidth={2.6}
                    aria-hidden="true"
                    data-writing-save-icon="bookmark"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={`${styles.iconControl} ${styles.done}`}
                aria-label="Done writing"
                title="Done writing"
                onClick={completeWriting}
                disabled={disabled || finishing}
                aria-busy={finishing || undefined}
                data-writing-done
              >
                <CloudCheck
                  className={styles.doneIcon}
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
              </Button>
            </div>
            <div className={styles.actionGroup}>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={styles.iconControl}
                aria-label="Markdown syntax help"
                aria-expanded={help}
                ref={helpButton}
                aria-haspopup="dialog"
                data-writing-info
                title="Markdown syntax help"
                onClick={() => setHelp(true)}
              >
                <Info
                  className={styles.controlGlyph}
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={`${styles.iconControl} ${styles.downloadControl}`}
                aria-label={
                  downloadState === "preparing"
                    ? "Preparing Markdown file"
                    : downloadState === "downloading"
                      ? "Starting Markdown download"
                      : downloadState === "complete"
                        ? "Markdown file ready"
                        : "Download reflection as Markdown"
                }
                title="Download Markdown"
                disabled={
                  !value.trim() ||
                  downloadState === "preparing" ||
                  downloadState === "downloading" ||
                  finishing
                }
                aria-busy={
                  downloadState === "preparing" ||
                  downloadState === "downloading" ||
                  undefined
                }
                data-writing-download
                data-download-state={downloadState}
                onClick={download}
              >
                <FileDown
                  className={styles.controlGlyph}
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
                {downloadState === "complete" && (
                  <Check
                    className={styles.downloadCheck}
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </Button>
            </div>
          </div>
          <Toolbar.Root
            className={styles.toolbar}
            aria-label="Markdown formatting"
            orientation="horizontal"
            disabled={!canFormat}
            data-writing-formats
            onFocusCapture={(event) => {
              const target = event.target;
              if (target instanceof HTMLButtonElement)
                target.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                  behavior: "auto",
                });
            }}
          >
            {formats.map(({ kind, label, icon: Icon }) => (
              <Toolbar.Button
                key={kind}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={
                  kind === "rule" ? undefined : activeFormats.has(kind)
                }
                render={<Button type="button" variant="ghost" />}
                onPointerDown={(event) => {
                  if (
                    event.button === 0 &&
                    document.activeElement === input.current
                  ) {
                    rememberSelection();
                    event.preventDefault();
                  }
                }}
                onMouseDown={(event) => {
                  if (document.activeElement === input.current)
                    event.preventDefault();
                }}
                onClick={() => format(kind)}
                data-format={kind}
              >
                <Icon
                  key={formatPulse.kind === kind ? formatPulse.revision : 0}
                  className={
                    formatPulse.kind === kind
                      ? styles.formatPulse
                      : styles.formatGlyph
                  }
                  size={17}
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
              </Toolbar.Button>
            ))}
          </Toolbar.Root>
        </div>
        <ReflectionWritingHelp
          open={open && help && !finishing}
          onOpenChange={setHelp}
          returnFocus={helpButton}
        />
        <div
          className={styles.workspace}
          data-view={view}
          inert={finishing || undefined}
        >
          <section
            className={styles.writingPane}
            hidden={view === "preview"}
            aria-label="Markdown source"
          >
            <Textarea
              ref={writingRef}
              id={`${id}-writing`}
              value={value}
              aria-label="Your writing"
              {...mentions.inputProps}
              onChange={(event) => {
                onChange(event.target.value);
                rememberSelection();
                setFeedback("");
              }}
              onSelect={rememberSelection}
              onFocus={() => {
                mentions.inputProps.onFocus();
                rememberSelection();
              }}
              onCompositionEnd={() => {
                mentions.inputProps.onCompositionEnd();
                rememberSelection();
              }}
              onKeyDown={(event) => {
                if (mentions.onKeyDown(event)) return;
                if (
                  !(event.ctrlKey || event.metaKey) ||
                  event.altKey ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                )
                  return;
                const key = event.key.toLowerCase();
                const kind =
                  key === "b"
                    ? "bold"
                    : key === "i"
                      ? "italic"
                      : key === "k"
                        ? "link"
                        : null;
                if (kind) {
                  event.preventDefault();
                  format(kind);
                }
              }}
              className={styles.writingArea}
              maxLength={DAILY_REFLECTION_MAX_LENGTH}
              placeholder="Write your reflection… @ links medications and categories; / links days, weeks and journals."
              spellCheck
              autoCapitalize="sentences"
              disabled={disabled}
              readOnly={finishing}
              aria-describedby={`${id}-limit ${id}-save-hint ${mentions.helpId}`}
              data-dialog-canvas
              data-journal-input
            />
            {mentions.help}
            {mentions.menu}
          </section>
          <section
            className={styles.previewPane}
            hidden={view === "write"}
            aria-label="Formatted reflection preview"
            aria-busy={deferredValue !== value || undefined}
          >
            <div
              ref={setPreviewElement}
              className={styles.previewContent}
              role="region"
              aria-label="Scrollable reflection preview"
              tabIndex={0}
              data-reflection-preview-scroll
            >
              {view !== "write" &&
                (deferredValue.trim() ? (
                  <ReflectionMarkdown value={deferredValue} day={day} />
                ) : (
                  <p className={styles.emptyPreview}>
                    Your formatted reflection will appear here.
                  </p>
                ))}
            </div>
          </section>
        </div>
        <span className="sr-only" role="status">
          {finishing ? "Returning to your check-in…" : ""}
        </span>
        <footer className={styles.footer} data-writing-footer>
          <div className={styles.footerBody}>
            <div className={styles.persistence} data-writing-persistence>
              <span
                className={styles.cloudState}
                role="status"
                data-reflection-save-status={saving.status}
                data-reflection-sync-active={
                  saving.status === "pending" || saving.status === "saving"
                }
                title={saving.message}
              >
                <SaveStateIcon
                  className={`${styles.saveStateIcon} ${saving.status === "pending" || saving.status === "saving" ? styles.backupIcon : ""}`}
                  data-writing-cloud-icon
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span>
                  {saving.status === "saved"
                    ? "Writing is up to date."
                    : saving.status === "pending"
                      ? "Waiting to sync…"
                      : saving.status === "saving"
                        ? "Syncing your writing…"
                        : saving.message}
                </span>
              </span>
              <span
                className={styles.draftState}
                data-draft-status={draftStatus}
                title={draftLabel(draftStatus)}
                data-writing-device-state
                role="status"
              >
                <span>{draftLabel(draftStatus)}</span>
                <HardDrive
                  className={styles.deviceIcon}
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
            </div>
            <div
              className={styles.stats}
              role="group"
              aria-label="Writing statistics"
              data-writing-statistics
            >
              <div className={styles.statsLeading} data-writing-reading-stats>
                <span className={styles.wordStat}>
                  <strong>{numberFormat.format(stats.words)}</strong>{" "}
                  {stats.words === 1 ? "word" : "words"}
                </span>
                <span className={styles.statSeparator} aria-hidden="true">
                  ·
                </span>
                <span className={styles.readingStat}>
                  {stats.readingMinutes
                    ? `~${stats.readingMinutes} min read`
                    : "0 min read"}
                </span>
              </div>
              <div className={styles.statsTrailing}>
                <span
                  id={`${id}-limit`}
                  className={styles.characterStat}
                  data-near-limit={remaining <= 200}
                >
                  <strong>{numberFormat.format(stats.characters)}</strong> /{" "}
                  {numberFormat.format(DAILY_REFLECTION_MAX_LENGTH)} chars
                </span>
                {stats.headings > 0 && (
                  <span className={styles.headingStat}>
                    {stats.headings}{" "}
                    {stats.headings === 1 ? "heading" : "headings"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={styles.feedback} role="status" data-writing-feedback>
            {feedback ||
              (remaining === 0
                ? "Character limit reached. You can still edit your entry."
                : "")}
          </span>
          <p
            id={`${id}-save-hint`}
            className={styles.footerHint}
            title={savedAt ? `Last check-in save: ${savedAt}` : undefined}
          >
            Writing saves separately. Save Check-In keeps the rest together.
          </p>
        </footer>
      </DialogContent>
      {open &&
        finishing &&
        createPortal(
          <div
            className={styles.celebration}
            data-writing-celebration
            data-phase={completionPhase}
            aria-hidden="true"
          >
            <div className={styles.celebrationWash} />
            <div className={styles.celebrationScene}>
              <span className={styles.celebrationRing} />
              <span className={styles.celebrationRing} />
              <span className={styles.celebrationRing} />
              <span className={styles.celebrationHalo} />
              <div className={styles.celebrationSeal}>
                <CloudCheck
                  className={styles.celebrationIcon}
                  strokeWidth={1.7}
                />
              </div>
              {celebrationSparks.map((index) => (
                <span
                  key={index}
                  className={styles.sparkOrbit}
                  style={{ rotate: `${index * 45 + 12}deg` }}
                >
                  <Sparkle
                    className={styles.celebrationSpark}
                    style={{ animationDelay: `${(index % 3) * 45}ms` }}
                    strokeWidth={1.6}
                  />
                </span>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
