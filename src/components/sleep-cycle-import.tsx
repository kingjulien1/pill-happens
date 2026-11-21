"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  HardDrive,
  ListChecks,
  ScanEye,
  Share,
  LoaderCircle,
  Check,
  X,
} from "lucide-react";
import { SquareArrowDownExit } from "./square-arrow-down-exit-icon";
import {
  pastedSleepImage,
  isSleepImagePasteTarget,
  readSleepImageClipboard,
} from "@/lib/sleep-image-clipboard";
import { Button } from "./ui/button";
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
import { usePendingSleepImage } from "./use-pending-sleep-image";
import {
  acknowledgeSleepImage,
  getPendingSleepImage,
} from "@/lib/shared-sleep-image";

const reportFieldCount = Object.keys(reportLabels).length;

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
  const exportHelp = useRef<HTMLElement>(null);
  const mounted = useRef(false);
  const task = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<ReportValues | null>(null);
  const [count, setCount] = useState(0);
  const [applied, setApplied] = useState(0);
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
    setApplied(0);
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
          : "Couldn’t read the values. Try the full export, or fill in the fields below.",
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error ? error.message : "Couldn’t read this image.",
        );
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
  }, [disabled, reading, pasting, load]);

  async function pasteImage() {
    if (disabled || reading || pasting) return;
    if (!navigator.clipboard?.read) {
      setMessage(
        "Use your browser’s Paste command with a copied image, or choose Bring Receipts to select a saved image.",
      );
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
        setMessage(
          "No image on the clipboard. In Sleep Cycle, share the full report and choose Copy Image, then try Paste Report again.",
        );
    } catch {
      if (mounted.current)
        setMessage(
          "Paste wasn’t allowed. Tap Paste Report and choose Paste in the browser prompt, or use Bring Receipts for a saved image.",
        );
    } finally {
      if (mounted.current) setPasting(false);
    }
  }

  function apply() {
    if (!review) return;
    onChange(withSleepStageTotals({ ...value, ...review }));
    setReview(null);
    setApplied(Object.keys(review).length);
    setMessage(
      "Night imported. Everything below is ready to check before you save.",
    );
  }

  const found = review ? Object.keys(review).length : 0;
  const statCount = reading
    ? count
    : review
      ? found
      : applied || reportFieldCount;
  const statLabel = reading
    ? "read"
    : review
      ? "found"
      : applied
        ? "added"
        : "fields";
  const currentStep = review ? 1 : applied ? 2 : 0;
  const showExportHelp = () => {
    exportHelp.current?.focus({ preventScroll: true });
    exportHelp.current?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <section
      ref={section}
      className={styles.import}
      data-sleep-cycle-import
      aria-labelledby={`${id}-heading`}
      aria-busy={reading || pasting}
      onDragOver={(event) => {
        if (
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
        if (!disabled && !reading && !pasting) void load(file);
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
              type="button"
              variant="ghost"
              className={styles.headingHelp}
              onClick={showExportHelp}
              aria-label={`${statCount} ${statLabel}. Show Sleep Cycle export instructions`}
              aria-controls={`${id}-export-help`}
              title="How to export the right report image"
              data-sleep-export-help
            >
              <span>
                <strong>{statCount}</strong>
                <span>{statLabel}</span>
              </span>
              <CircleHelp size={13} strokeWidth={2} aria-hidden="true" />
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
          <Button
            type="button"
            variant="ghost"
            className={styles.importAction}
            disabled={disabled || reading || pasting}
            onClick={() => void pasteImage()}
            aria-label="Paste Report: read a copied Sleep Cycle image"
            data-sleep-paste
          >
            <span className={styles.actionTop} aria-hidden="true">
              <span className={styles.actionIcon}>
                <SquareArrowDownExit size={18} strokeWidth={2.3} />
              </span>
              <ArrowUpRight
                size={12}
                strokeWidth={2.3}
                className={styles.actionArrow}
              />
            </span>
            <strong>{pasting ? "Choose Paste…" : "Paste Report"}</strong>
            <span className={styles.actionDetail}>Copied from Sleep Cycle</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={styles.importAction}
            disabled={disabled || reading || pasting}
            onClick={() => input.current?.click()}
            aria-label="Bring Receipts: choose a saved report image"
            data-sleep-choose
          >
            <span className={styles.actionTop} aria-hidden="true">
              <span className={styles.actionIcon}>
                <ScanEye size={18} strokeWidth={2.3} />
              </span>
              <ArrowUpRight
                size={12}
                strokeWidth={2.3}
                className={styles.actionArrow}
              />
            </span>
            <strong>Bring Receipts</strong>
            <span className={styles.actionDetail}>
              Saved in Photos or Files
            </span>
          </Button>
        </div>
        <ol className={styles.flow} aria-label="Import steps">
          {["Bring image", "Check values", "Apply to draft"].map(
            (label, index) => (
              <li
                key={label}
                aria-current={currentStep === index ? "step" : undefined}
                data-current={currentStep === index || undefined}
              >
                <span aria-hidden="true">0{index + 1}</span>
                <strong>{label}</strong>
              </li>
            ),
          )}
        </ol>
        <p className={styles.localNote}>
          <HardDrive size={12} aria-hidden="true" />
          <span>
            Read on this device. Nothing is applied until you approve.
          </span>
        </p>
      </div>
      {message && (
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
            {(Object.keys(review) as ReportKey[]).map((key) => {
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
                        : key === "coughingRate"
                          ? " / h"
                          : ""}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className={styles.hint}>
            Only the readings shown here replace matching fields. Anything else
            stays as you entered it. Save Check-In keeps the finished draft with
            this day.
          </p>
          <div className={styles.reviewActions}>
            <Button
              type="button"
              disabled={disabled}
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
      <aside
        ref={exportHelp}
        id={`${id}-export-help`}
        className={styles.exportHelp}
        tabIndex={-1}
        aria-labelledby={`${id}-export-heading`}
      >
        <Share size={20} strokeWidth={2} aria-hidden="true" />
        <div>
          <h4 id={`${id}-export-heading`}>Skip the screenshot séance.</h4>
          <p>
            Sleep Cycle can make one complete, neatly arranged image. No
            screenshots to stitch, crop or line up.
          </p>
          <ol>
            <li>
              <strong>Open the night.</strong> In Sleep Cycle’s Journal, choose
              the night you want to bring in.
            </li>
            <li>
              <strong>Share the full report.</strong> Use the portrait image
              with the score, graph, sleep stages, metric tiles and Sleep Cycle
              logo.
            </li>
            <li>
              <strong>Copy Image → Paste Report.</strong> Or choose{" "}
              <strong>Save Image</strong> and pick that file with{" "}
              <strong>Bring Receipts.</strong>
            </li>
          </ol>
          <p className={styles.exportFoot}>
            Keep the image uncropped; the reader looks for the same layout each
            time. Sharing menu labels can vary by version.{" "}
            <a
              href="https://support.sleepcycle.com/"
              target="_blank"
              rel="noreferrer"
            >
              Sleep Cycle help <ArrowUpRight size={10} aria-hidden="true" />
            </a>
          </p>
        </div>
      </aside>
    </section>
  );
}
