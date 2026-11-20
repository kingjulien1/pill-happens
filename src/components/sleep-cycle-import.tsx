"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlarmClockCheck,
  ArrowRight,
  ImageDown,
  LoaderCircle,
  Check,
  X,
} from "lucide-react";
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
  const task = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<ReportValues | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => () => task.current?.abort(), []);

  async function load(file: File) {
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
      className={styles.import}
      aria-labelledby={`${id}-heading`}
      aria-busy={reading}
    >
      <hr className={styles.separator} />
      <div className={styles.heading}>
        <AlarmClockCheck
          className={styles.mark}
          size={38}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <div>
          <h3 id={`${id}-heading`}>Sleep, With Receipts.</h3>
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
        disabled={disabled || reading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void load(file);
        }}
      />
      <TodayActionButton
        type="button"
        className={styles.importButton}
        radius={17}
        disabled={disabled || reading}
        style={{ ...getIntakeActionThemeStyle(), height: 48, minHeight: 48 }}
        onClick={() => input.current?.click()}
      >
        {reading ? (
          <LoaderCircle
            className={styles.spinner}
            size={17}
            style={{ color: "var(--control-ink)" }}
            aria-hidden="true"
          />
        ) : (
          <ImageDown
            size={17}
            style={{ color: "var(--control-ink)" }}
            aria-hidden="true"
          />
        )}
        <span>{reading ? "Reading Your Snooze…" : "Scan My Snooze"}</span>
        <span className={styles.buttonAside}>
          / {reading ? `${count} of 11` : "Import Report"}
        </span>
        <ArrowRight
          size={17}
          style={{ color: "var(--control-ink)" }}
          aria-hidden="true"
        />
      </TodayActionButton>
      <p className={styles.hint}>
        Use the full portrait share image. It stays on this device; the readings
        go into your editable draft.
      </p>
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
