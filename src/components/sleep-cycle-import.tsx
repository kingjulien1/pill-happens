"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ClipboardPaste,
  ImageDown,
  LoaderCircle,
  Check,
  X,
} from "lucide-react";
import { ActionIcon } from "./action-icon";
import {
  pastedSleepImage,
  isSleepImagePasteTarget,
  readSleepImageClipboard,
} from "@/lib/sleep-image-clipboard";
import { TodayActionButton } from "./today-action-button";
import { Button } from "./ui/button";
import { getIntakeActionThemeStyle } from "@/lib/action-button-system";
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
import { SleepImportAlarm } from "./sleep-import-alarm";
import { usePendingSleepImage } from "./use-pending-sleep-image";
import {
  acknowledgeSleepImage,
  getPendingSleepImage,
} from "@/lib/shared-sleep-image";

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
  const mounted = useRef(false);
  const task = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<ReportValues | null>(null);
  const [count, setCount] = useState(0);
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
            setMessage(`Reading your night · ${next} / 11`);
          }
        },
      );
      if (controller.signal.aborted) return;
      const found = Object.keys(result).length;
      if (found) setReview(result);
      setMessage(
        found
          ? `${found} of 11 readings found. Give them a quick once-over.`
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
        "Use your browser’s Paste command with a copied image, or choose Scan My Snooze.",
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
          "No image on the clipboard. Copy your sleep report image, then try Paste Image again.",
        );
    } catch {
      if (mounted.current)
        setMessage(
          "Paste wasn’t allowed. Tap Paste Image and choose Paste in the browser prompt, or choose Scan My Snooze.",
        );
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

  return (
    <section
      ref={section}
      className={styles.import}
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
        <SleepImportAlarm />
        <div>
          <h3 id={`${id}-heading`} className={dialogStyles.title}>
            Sleep, With Receipts.
          </h3>
          <p>
            Bring your Sleep Cycle report. We’ll read the times, stages and
            score, then let you check the numbers. One less job for your morning
            brain.
          </p>
        </div>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/*"
        disabled={disabled || reading || pasting}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void load(file);
        }}
      />
      <TodayActionButton
        type="button"
        data-intake-paint="satin"
        className={`intake-primary-cta ${styles.importButton}`}
        radius={14.7}
        disabled={disabled || reading || pasting}
        style={{
          ...getIntakeActionThemeStyle(),
          height: 50.4,
          minHeight: 50.4,
        }}
        onClick={() => input.current?.click()}
      >
        <span className="intake-primary-row">
          <span className="intake-primary-copy">
            <span className="intake-primary-label">
              {reading ? (
                <LoaderCircle
                  className={styles.spinner}
                  size={14}
                  aria-hidden="true"
                />
              ) : (
                <ImageDown size={14} aria-hidden="true" />
              )}
              <span>{reading ? "Reading Your Snooze…" : "Scan My Snooze"}</span>
            </span>
            <span className="intake-primary-dot" aria-hidden="true">
              ·
            </span>
            <span className="intake-primary-aside">
              {reading ? `${count} of 11` : "Import Report"}
            </span>
          </span>
          <ActionIcon name="next" className="intake-primary-next" />
        </span>
      </TodayActionButton>
      <div className={styles.importActions}>
        <Button
          type="button"
          variant="ghost"
          className={styles.pasteButton}
          disabled={disabled || reading || pasting}
          onClick={() => void pasteImage()}
        >
          <ClipboardPaste size={14} aria-hidden="true" />
          {pasting ? "Choose Paste…" : "Paste Image"}
        </Button>
      </div>
      {message && (
        <p role="status" className={styles.status}>
          {message}
        </p>
      )}
      {review && (
        <div className={styles.review}>
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
                    {key === "regularity"
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
            Apply these readings to the matching fields below. Save Check-In
            keeps them with this day.
          </p>
          <div className={styles.reviewActions}>
            <Button type="button" disabled={disabled} onClick={apply}>
              <Check size={15} />
              Use These Readings
            </Button>
            <Button
              type="button"
              variant="ghost"
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
    </section>
  );
}
