"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { CheckInSection } from "./check-in-section";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  reportMetrics,
  reportLabels,
  sleepCycleMetrics,
  type ReportKey,
  type ReportValues,
} from "@/lib/sleep-cycle-report";
import type { MorningSleepDraft } from "@/lib/morning-sleep";
import styles from "./morning-sleep-fields.module.css";

export function SleepCycleImport({
  value,
  onChange,
  disabled,
}: {
  value: MorningSleepDraft;
  onChange: (next: MorningSleepDraft) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const task = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<ReportValues | null>(null);
  useEffect(() => () => task.current?.abort(), []);

  async function load(file: File) {
    const controller = new AbortController();
    task.current = controller;
    setReading(true);
    setReview(null);
    setMessage("Preparing the image reader…");
    try {
      const { readSleepCycleImage } =
        await import("@/lib/read-sleep-cycle-image");
      const result = await readSleepCycleImage(
        file,
        controller.signal,
        (count) => {
          if (!controller.signal.aborted)
            setMessage(`Reading report · ${count} / 11`);
        },
      );
      if (controller.signal.aborted) return;
      const count = Object.keys(result).length;
      if (count) setReview(result);
      setMessage(
        count
          ? `Read ${count} of 11 values. Check them against your report before applying.`
          : "No values were readable. Try the original export or enter them below.",
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
    const patch: Partial<MorningSleepDraft> = { ...review };
    if (review.lightMinutes && review.deepMinutes && review.dreamMinutes) {
      const minutes =
        Number(review.lightMinutes) +
        Number(review.deepMinutes) +
        Number(review.dreamMinutes);
      if (minutes <= 1440) {
        patch.sleepHours = String(Math.floor(minutes / 60));
        patch.sleepMinutes = String(minutes % 60);
      }
    }
    onChange({ ...value, ...patch });
    setReview(null);
    setMessage(
      "Added to your draft. Review the sleep fields, then save your check-in.",
    );
  }

  return (
    <CheckInSection
      caption="Sleep Cycle"
      context="Nightly report"
      detail="Optional"
    >
      <section className={styles.section}>
        <p className="text-xs text-muted-foreground">
          Choose the full portrait share image for this morning. Your browser
          reads it on this device.
        </p>
        <input
          ref={input}
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void load(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || reading}
          onClick={() => input.current?.click()}
        >
          <ImagePlus />
          {reading ? "Reading image…" : "Choose report image"}
        </Button>
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
        {review && (
          <div className="grid gap-2">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(review) as ReportKey[]).map((key) => (
                <div key={key}>
                  <dt className="text-muted-foreground">
                    {reportLabels[key as keyof typeof reportLabels] ??
                      sleepCycleMetrics[key as keyof typeof sleepCycleMetrics]
                        ?.label}
                  </dt>
                  <dd>
                    {review[key]}{" "}
                    {key.endsWith("Minutes")
                      ? "min"
                      : key === "regularity"
                        ? "%"
                        : key === "coughingRate"
                          ? "/ h"
                          : ""}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Applying replaces the matching fields. Total sleep is calculated
              when all three sleep stages are readable.
            </p>
            <div className="flex gap-2">
              <Button type="button" disabled={disabled} onClick={apply}>
                Apply to draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setReview(null);
                  setMessage("");
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {reportMetrics.map((key) => (
            <label key={key} className="grid gap-1 text-xs">
              {sleepCycleMetrics[key].label} · {sleepCycleMetrics[key].unit}
              <Input
                type="number"
                min={0}
                max={
                  Number.isFinite(sleepCycleMetrics[key].max)
                    ? sleepCycleMetrics[key].max
                    : undefined
                }
                step={key === "coughingRate" ? "any" : 1}
                disabled={disabled}
                value={value[key] ?? ""}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
      </section>
    </CheckInSection>
  );
}
