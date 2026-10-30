"use client";

import type { CSSProperties } from "react";
import { BenzodiazepineBadge } from "@/components/benzodiazepine-badge";
import { MedicationGlyph } from "@/components/medication-icon";
import {
  doseMg,
  formatDose,
  toLocalInput,
  type Intake,
  type Medication,
} from "@/lib/domain";
import { getIntakeCardWaves } from "@/lib/intake-card-waves";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getMedicationColorScale,
  getMedicationPreviewSurface,
} from "@/lib/medication-preview-colors";
import {
  getMedicationType,
  isMeteredMedicationType,
} from "@/lib/medication-types";
import { getSvgIcon } from "@/lib/svg-icon-catalog";

export function IntakeCard({
  entry,
  medication,
  day,
  timeZone,
  onEdit,
  disabled = false,
}: {
  entry: Intake;
  medication?: Medication;
  day: string;
  timeZone: string;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const color = getMedicationColor(medication?.color);
  const scale = getMedicationColorScale(color.value);
  const waves = getIntakeCardWaves(entry.id);
  const svg = getSvgIcon(medication?.icon ?? "pill");
  const pigment =
    svg?.variant === "color" ? (svg.color?.hex ?? scale.icon) : scale.icon;
  const type = entry.medicationForm ?? medication?.form;
  const units = getMedicationType(type);
  const localTime = toLocalInput(entry.takenAt, timeZone);
  const time = localTime.slice(11);
  const localDay = localTime.slice(0, 10);
  const isBenzodiazepine = medication?.isBenzodiazepine === true;

  const style = {
    "--entry-light": scale.lighter,
    // Explicit alpha avoids opaque CSS color-mix fallbacks in older browsers.
    "--entry-rim-tint": `${scale.lighter}14`,
    "--entry-deep": scale.darker,
    "--entry-icon-tint": `${color.hex}66`,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${entry.medicationName}${isBenzodiazepine ? ", benzodiazepine" : ""}, ${formatDose(doseMg(entry))} milligrams, ${time}`}
      className={`intake-log-card${isBenzodiazepine ? " benzodiazepine-highlight" : ""}`}
      style={style}
      data-intake-card={entry.id}
      data-benzodiazepine={isBenzodiazepine || undefined}
    >
      <span aria-hidden="true" className="intake-card-glass">
        <svg
          className="intake-card-curves"
          viewBox="0 0 360 150"
          preserveAspectRatio="none"
          fill="none"
          focusable="false"
          data-intake-curves
        >
          <path d={waves.curveA} vectorEffect="non-scaling-stroke" />
          <path d={waves.curveB} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="intake-card-ink" data-intake-ink />
      </span>
      <div className="intake-card-content relative flex items-start gap-3">
        <span
          className="intake-card-focus relative flex size-14 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="intake-card-mark"
            data-medication-mark
            data-medication-color={color.value}
            style={
              {
                color: scale.icon,
                backgroundColor:
                  getMedicationPreviewSurface(pigment) ?? "var(--popover)",
                "--medication-rotation": `${medication?.iconRotation ?? 0}deg`,
              } as CSSProperties
            }
          >
            <MedicationGlyph icon={medication?.icon} className="size-7" />
          </span>
        </span>
        <div className="intake-card-details min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <h3
                className="min-w-0 truncate text-[13px] font-medium"
                title={entry.medicationName}
                data-intake-name
              >
                {entry.medicationName}
              </h3>
              {isBenzodiazepine && <BenzodiazepineBadge />}
            </div>
            <span
              className="shrink-0 text-[13px] font-medium tabular-nums"
              data-intake-dose
            >
              {formatDose(doseMg(entry))}
              <span className="intake-card-dose-unit ml-1 text-[10px] font-normal">
                mg
              </span>
            </span>
          </div>
          <div className="intake-card-meta mt-1.5 text-[10px]">
            <span className="min-w-0">
              {time}
              {localDay !== day ? " · next morning" : ""}
              <span className="mx-1">·</span>
              {formatDose(entry.quantity)}
              {isMeteredMedicationType(type)
                ? ` ${entry.quantity === 1 ? units.unit : units.units}`
                : ""}{" "}
              × {formatDose(entry.strengthMg)} mg
            </span>
          </div>
          {entry.note && (
            <p
              className="intake-card-note mt-2.5 text-[11px] leading-relaxed break-words"
              data-intake-note
            >
              {entry.note}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
