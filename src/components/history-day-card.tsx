"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import {
  dayIntakes,
  formatDay,
  formatDose,
  goalForDay,
  totalsForDay,
  type AppData,
} from "@/lib/domain";
import { getHistoryCardArt } from "@/lib/history-card-art";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationPreviewSurface } from "@/lib/medication-preview-colors";

export function HistoryDayCard({ data, day }: { data: AppData; day: string }) {
  const totals = totalsForDay(data, day);
  const count = dayIntakes(data, day).length;
  const goals = totals.map((total) =>
    goalForDay(data, total.medicationId, day),
  );
  const hasGoals = goals.some(Boolean);
  const over = totals.some(
    (total, index) =>
      goals[index] && total.totalMg > goals[index]!.dailyLimitMg,
  );
  const status = hasGoals
    ? over
      ? "Above a recorded maximum"
      : "Within recorded maximums"
    : "No daily goal";
  const art = getHistoryCardArt(day, totals, data.medications);
  const fourth = art.colors[3] ?? art.secondary;
  const style = {
    "--day-color-a": art.primary,
    "--day-color-b": art.secondary,
    "--day-color-c": art.tertiary,
    "--day-color-d": fourth,
    "--day-phase": `${art.phaseSeconds}s`,
    "--day-orbit-angle": `${art.orbitAngle}deg`,
  } as CSSProperties;

  return (
    <Link
      href={`/history/${day}`}
      className="history-day-card"
      style={style}
      data-history-card={day}
      data-history-palette={art.colors.join(",")}
    >
      <span aria-hidden="true" className="history-card-bleed" />
      <span aria-hidden="true" className="history-card-glass">
        <span className="history-card-color-overlay" data-history-color-overlay>
          <span className="history-card-mesh" />
          <span className="history-card-pattern" />
          <svg
            className="history-card-curves"
            viewBox="0 0 360 150"
            fill="none"
            focusable="false"
            data-history-curves
          >
            {art.curves.map((curve, index) => (
              <path key={index} d={curve} />
            ))}
          </svg>
        </span>
        <span className="history-card-ink" data-history-ink />
      </span>
      <div className="history-card-content p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="history-card-focus">
            <span className="history-card-orbit">
              <span className="history-card-bead" />
              <span className="history-card-bead" />
            </span>
            <span className="history-card-sticker history-card-sticker--a" />
            <span className="history-card-sticker history-card-sticker--b" />
            <span className="history-card-confetti history-card-confetti--a" />
            <span className="history-card-confetti history-card-confetti--b" />
            <span className="history-card-confetti history-card-confetti--c" />
            <span
              className="history-card-mark"
              style={{
                color: art.primary,
                backgroundColor:
                  getMedicationPreviewSurface(art.primary) ?? "var(--popover)",
              }}
            >
              <ActionIcon name="date" className="size-5" />
            </span>
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[13px] font-medium">
              <time dateTime={day}>
                {formatDay(day, { weekday: "short", month: "short" })}
              </time>
            </h2>
            <p
              className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground"
              data-history-status={
                hasGoals ? (over ? "above" : "within") : "none"
              }
            >
              {count} {count === 1 ? "intake" : "intakes"} · {status}
            </p>
          </div>
          <ActionIcon
            name="open"
            className="mt-1 size-[18px] text-muted-foreground"
          />
        </div>
        <div className="history-card-totals mt-3.5 flex flex-wrap gap-2">
          {totals.map((total) => {
            const medication = data.medications.find(
              (item) => item.id === total.medicationId,
            );
            return (
              <span
                key={total.medicationId}
                className="history-card-total min-w-0 max-w-full"
                data-history-total={total.medicationId}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full ring-1 ring-foreground/10"
                  style={{
                    backgroundColor: getMedicationColor(medication?.color).hex,
                  }}
                />
                <span className="min-w-0 truncate" title={total.medicationName}>
                  {total.medicationName}
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatDose(total.totalMg)} mg
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
