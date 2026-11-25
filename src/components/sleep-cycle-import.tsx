"use client";

import {
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  BookOpenText,
  FolderOpen,
  ListChecks,
  Import,
  Paperclip,
  LoaderCircle,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  pastedSleepImage,
  isSleepImagePasteTarget,
  readSleepImageClipboard,
} from "@/lib/sleep-image-clipboard";
import { Button } from "./ui/button";
import { DialogErrorPanel } from "./dialog-error-panel";
import {
  reportLabels,
  type ReportKey,
  type ReportValues,
} from "@/lib/sleep-cycle-report";
import {
  withSleepStageTotals,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import styles from "./sleep-cycle-import.module.css";
import dialogStyles from "./responsive-modal.module.css";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import { SleepCycleExportHelp } from "./sleep-cycle-export-help";
import { usePendingSleepImage } from "./use-pending-sleep-image";
import {
  acknowledgeSleepImage,
  getPendingSleepImage,
} from "@/lib/shared-sleep-image";

const reportFieldCount = Object.keys(reportLabels).length;

function ReportAction({
  icon: Icon,
  label,
  aside,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  icon: LucideIcon;
  label: string;
  aside: string;
}) {
  return (
    <button type="button" className={styles.importAction} {...props}>
      <span className={styles.actionFace}>
        <span className={styles.actionContent}>
          <Icon
            size={20.6}
            strokeWidth={2.3}
            className={styles.actionIcon}
            aria-hidden="true"
          />
          <span className={`intake-primary-copy ${styles.actionCopy}`}>
            <strong>{label}</strong>
            <span className="intake-primary-dot" aria-hidden="true">
              ·
            </span>
            <span className="intake-primary-aside">{aside}</span>
          </span>
        </span>
        <ArrowUpRight
          size={22}
          strokeWidth={2.3}
          className={styles.actionArrow}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

export function SleepCycleImport({
  value,
  onChange,
  disabled,
}: {
  value: MorningSleepDraft;
  onChange: (next: MorningSleepDraft) => void;
  disabled: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const section = useRef<HTMLElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const task = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [message, setMessage] = useState<string | { problem: string }>("");
  const [review, setReview] = useState<ReportValues | null>(null);
  const [count, setCount] = useState(0);
  const [exportHelpOpen, setExportHelpOpen] = useState(false);
  const pendingImage = usePendingSleepImage();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      task.current?.abort();
    };
  }, []);

  const load = useCallback(async (file: File) => {
    if (!mounted.current) return;
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setReading(true);
    setCount(0);
    setReview(null);
    setMessage("Waking up the image reader…");
    try {
      const { readSleepCycleImage } =
        await import("@/lib/read-sleep-cycle-image");
      controller.signal.throwIfAborted();
      const result = await readSleepCycleImage(
        file,
        controller.signal,
        (next) => {
          if (!controller.signal.aborted) {
            setCount(next);
            setMessage(`Reading your night · ${next} / ${reportFieldCount}`);
          }
        },
      );
      if (controller.signal.aborted) return;
      const found = Object.keys(result).length;
      if (found) setReview(result);
      setMessage(
        found
          ? `${found} of ${reportFieldCount} readings found. Give them a quick once-over.`
          : {
              problem:
                "Couldn’t read the values. Try the full export, or fill in the fields below.",
            },
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage({
          problem:
            error instanceof Error
              ? error.message
              : "Couldn’t read this image.",
        });
    } finally {
      if (!controller.signal.aborted) setReading(false);
    }
  }, []);

  useEffect(() => {
    if (!pendingImage || disabled || reading || pasting) return;
    let cancelled = false;
    // Receive the external handoff after commit; a replacement/closed form must
    // not consume a newer file or start a duplicate reader during effect replay.
    queueMicrotask(() => {
      if (cancelled || getPendingSleepImage()?.id !== pendingImage.id) return;
      void load(pendingImage.file);
      acknowledgeSleepImage(pendingImage.id);
    });
    return () => {
      cancelled = true;
    };
  }, [pendingImage, disabled, reading, pasting, load]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (
        disabled ||
        reading ||
        pasting ||
        exportHelpOpen ||
        event.defaultPrevented ||
        isSleepImagePasteTarget(event.target)
      )
        return;
      if (
        !section.current ||
        section.current.closest('[inert], [aria-hidden="true"]')
      )
        return;
      const file = pastedSleepImage(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      void load(file);
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [disabled, reading, pasting, exportHelpOpen, load]);

  async function pasteImage() {
    if (disabled || reading || pasting) return;
    if (!navigator.clipboard?.read) {
      setMessage({
        problem:
          "Use your browser’s Paste command with a copied image, or choose a saved report below.",
      });
      return;
    }
    setPasting(true);
    try {
      const file = await readSleepImageClipboard(() =>
        navigator.clipboard.read(),
      );
      if (!mounted.current) return;
      if (file) void load(file);
      else
        setMessage({
          problem:
            "No image on the clipboard. In Sleep Cycle, share the full report and choose Copy Image, then try Paste Report again.",
        });
    } catch {
      if (mounted.current)
        setMessage({
          problem:
            "Paste wasn’t allowed. Tap Paste Report and choose Paste in the browser prompt, or choose a saved image.",
        });
    } finally {
      if (mounted.current) setPasting(false);
    }
  }

  function apply() {
    if (!review) return;
    onChange(withSleepStageTotals({ ...value, ...review }));
    setReview(null);
    setMessage(
      "Night imported. Everything below is ready to check before you save.",
    );
  }

  const found = review ? Object.keys(review).length : 0;
  const validSounds =
    (review?.snoringMinutes === undefined ||
      (/^\d+$/.test(review.snoringMinutes) &&
        Number(review.snoringMinutes) <= 1440)) &&
    (review?.coughingRate === undefined ||
      (/^\d+(?:\.\d+)?$/.test(review.coughingRate) &&
        Number.isFinite(Number(review.coughingRate))));

  return (
    <section
      ref={section}
      className={styles.import}
      data-sleep-cycle-import
      aria-labelledby={`${id}-heading`}
      aria-busy={reading || pasting}
      onDragOver={(event) => {
        if (
          !exportHelpOpen &&
          Array.from(event.dataTransfer.items).some(
            (item) => item.kind === "file" && item.type.startsWith("image/"),
          )
        )
          event.preventDefault();
      }}
      onDrop={(event) => {
        const file = pastedSleepImage(event.dataTransfer);
        if (!file) return;
        event.preventDefault();
        if (!disabled && !reading && !pasting && !exportHelpOpen)
          void load(file);
      }}
    >
      <hr className={styles.separator} />
      <div className={styles.heading}>
        <div>
          <div className={styles.headingRow}>
            <h3 id={`${id}-heading`} className={dialogStyles.title}>
              Let the Report Talk.
            </h3>
            <Button
              ref={helpButton}
              type="button"
              variant="ghost"
              size="icon"
              className={styles.headingHelp}
              onClick={() => setExportHelpOpen(true)}
              aria-label="How to import a Sleep Cycle report"
              aria-haspopup="dialog"
              aria-expanded={exportHelpOpen}
              title="How to export the right report image"
              data-sleep-export-help
            >
              <BookOpenText size={19} strokeWidth={2.2} aria-hidden="true" />
            </Button>
          </div>
          <div className={dialogStyles.context}>
            <JournalDialogSubheading
              title="Rest, Allegedly"
              detail="Resurrection Pending"
            />
          </div>
        </div>
        <p
          className={`${dialogStyles.description} text-balance md:text-wrap`}
          data-sleep-import-description
        >
          One night, one complete image. Paste the report straight from Sleep
          Cycle or choose a saved copy. Check the readings, then apply them to
          this draft—the graph can testify, but you get the final word.
        </p>
      </div>
      <hr className={`${styles.separator} ${styles.headingDivider}`} />
      <input
        ref={input}
        hidden
        type="file"
        accept="image/*"
        aria-label="Choose a saved Sleep Cycle report image"
        data-sleep-report-file
        disabled={disabled || reading || pasting}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void load(file);
        }}
      />
      <div className={styles.actionPanel}>
        <div
          className={styles.importActions}
          role="group"
          aria-label="Bring in a Sleep Cycle report"
        >
          <section
            className={styles.actionSection}
            data-sleep-import-method="paste"
            aria-labelledby={`${id}-paste-heading`}
          >
            <div className={styles.actionHeading}>
              <h4 id={`${id}-paste-heading`}>From your clipboard</h4>
              <span>Quickest way in</span>
            </div>
            <ReportAction
              icon={Import}
              label={pasting ? "Choose Paste…" : "Paste Report"}
              aside="Peak Effort"
              disabled={disabled || reading || pasting}
              onClick={() => void pasteImage()}
              aria-label={
                pasting
                  ? "Choose Paste…"
                  : "Paste Report: read a copied Sleep Cycle image"
              }
              aria-describedby={`${id}-paste-description`}
              data-sleep-paste
            />
            <p id={`${id}-paste-description`} className={styles.actionDetail}>
              Choose <strong>Copy Image</strong> in Sleep Cycle’s share menu,
              then paste it here. No file hunting required.
            </p>
          </section>
          <div className={styles.actionTransition}>
            <FolderOpen size={12} aria-hidden="true" />
            <span>Already saved it?</span>
          </div>
          <section
            className={styles.actionSection}
            data-sleep-import-method="file"
            aria-labelledby={`${id}-choose-heading`}
          >
            <div className={styles.actionHeading}>
              <h4 id={`${id}-choose-heading`}>From Photos or Files</h4>
              <span>Same report, saved</span>
            </div>
            <ReportAction
              icon={Paperclip}
              label="Bring Receipts"
              aside="Snooze Snitch"
              disabled={disabled || reading || pasting}
              onClick={() => input.current?.click()}
              aria-label="Bring Receipts: choose a saved report image"
              aria-describedby={`${id}-choose-description`}
              data-sleep-choose
            />
            <p id={`${id}-choose-description`} className={styles.actionDetail}>
              Choose the full portrait report you saved. Keep the score, graph
              and all the tiles in the picture.
            </p>
          </section>
        </div>
      </div>
      {typeof message !== "string" ? (
        <DialogErrorPanel
          title="Report couldn’t be read"
          message={message.problem}
          action={
            !disabled && !reading && !pasting
              ? {
                  label: "Choose a saved report",
                  onClick: () => input.current?.click(),
                }
              : undefined
          }
        />
      ) : (
        message && (
          <div className={styles.statusArea}>
            <p role="status" className={styles.status}>
              {reading && (
                <LoaderCircle
                  size={13}
                  className={styles.spinner}
                  aria-hidden="true"
                />
              )}
              {message}
            </p>
            {reading && (
              <progress
                className={styles.progress}
                value={count}
                max={reportFieldCount}
                aria-label="Reading sleep report fields"
              />
            )}
          </div>
        )
      )}
      {review && (
        <div className={styles.review} data-sleep-report-review>
          <div className={styles.reviewHeading}>
            <strong>
              <ListChecks size={16} aria-hidden="true" />
              Check the readings
            </strong>
            <span>
              <strong>{found}</strong> / {reportFieldCount}
            </span>
          </div>
          <dl>
            {(Object.keys(review) as ReportKey[])
              .filter(
                (key) => key !== "snoringMinutes" && key !== "coughingRate",
              )
              .map((key) => {
                const raw = review[key];
                const display = key.endsWith("Minutes")
                  ? `${Math.floor(Number(raw) / 60)} h ${Number(raw) % 60} min`
                  : raw;
                return (
                  <div key={key}>
                    <dt>{reportLabels[key]}</dt>
                    <dd>
                      {display}
                      {key === "reportScore"
                        ? " / 100"
                        : key === "regularity"
                          ? "%"
                          : ""}
                    </dd>
                  </div>
                );
              })}
          </dl>
          <fieldset className={styles.soundFields} disabled={disabled}>
            <legend>Night sounds</legend>
            {(["snoringMinutes", "coughingRate"] as const).map((key) => (
              <label key={key}>
                {key === "snoringMinutes"
                  ? "Snoring (min)"
                  : "Coughing (per hour)"}
                <input
                  type="text"
                  inputMode={key === "snoringMinutes" ? "numeric" : "decimal"}
                  placeholder="Not read"
                  value={review[key] ?? ""}
                  onChange={(event) => {
                    const updated = { ...review };
                    const raw = event.target.value.trim().replace(",", ".");
                    if (raw) updated[key] = raw;
                    else delete updated[key];
                    setReview(updated);
                  }}
                />
              </label>
            ))}
          </fieldset>
          {!validSounds && (
            <p role="status" className={styles.hint}>
              Use 0–1440 whole minutes for snoring and a nonnegative number for
              coughs per hour.
            </p>
          )}
          <p className={styles.hint}>
            Only the readings shown here replace matching fields. Anything else
            stays as you entered it. Save Check-In keeps the finished draft with
            this day.
          </p>
          <div className={styles.reviewActions}>
            <Button
              type="button"
              disabled={disabled || !found || !validSounds}
              onClick={apply}
              className={styles.reviewApply}
              data-sleep-apply
            >
              <Check size={15} />
              Use These Readings
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={styles.reviewDiscard}
              onClick={() => {
                setReview(null);
                setMessage("");
              }}
            >
              <X size={14} />
              Discard
            </Button>
          </div>
        </div>
      )}
      <SleepCycleExportHelp
        open={exportHelpOpen}
        onOpenChange={setExportHelpOpen}
        returnFocus={helpButton}
      />
    </section>
  );
}
