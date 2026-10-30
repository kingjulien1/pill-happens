"use client";

import type { CSSProperties } from "react";
import { BenzodiazepineBadge } from "@/components/benzodiazepine-badge";
import { IntakeCardShine } from "@/components/intake-card-shine";
import { MedicationGlyph } from "@/components/medication-icon";
import {
  doseMg,
  formatDose,
  toLocalInput,
  type Intake,
  type Medication,
} from "@/lib/domain";
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
  shineEligible = true,
}: {
  entry: Intake;
  medication?: Medication;
  day: string;
  timeZone: string;
  onEdit: () => void;
  disabled?: boolean;
  shineEligible?: boolean;
}) {
  const color = getMedicationColor(medication?.color);
  const scale = getMedicationColorScale(color.value);
  const rose = getMedicationColor("tw-rose-500").hex;
  const roseCopy = getMedicationColor("tw-rose-200").hex;
  const svg = getSvgIcon(medication?.icon ?? "pill");
  const pigment =
    svg?.variant === "color" ? (svg.color?.hex ?? scale.icon) : scale.icon;
  const type = entry.medicationForm ?? medication?.form;
  const units = getMedicationType(type);
  const localTime = toLocalInput(entry.takenAt, timeZone);
  const time = localTime.slice(11);
  const nextMorning = localTime.slice(0, 10) !== day;
  const isBenzodiazepine = medication?.isBenzodiazepine === true;
  const ingredient = medication?.activeIngredient?.trim();

  const style = {
    "--entry-icon-tint": `${color.hex}66`,
    "--entry-benzo": rose,
    "--entry-benzo-copy": roseCopy,
    "--entry-benzo-wash": `${rose}29`,
    "--entry-benzo-edge": `${rose}40`,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${entry.medicationName}${isBenzodiazepine ? ", benzodiazepine" : ""}, ${ingredient ? `active ingredient ${ingredient}` : "active ingredient not set"}, ${formatDose(doseMg(entry))} milligrams, ${time}${nextMorning ? ", next morning" : ""}`}
      className="intake-log-card"
      style={style}
      data-intake-card={entry.id}
      data-shine-eligible={shineEligible}
      data-benzodiazepine={isBenzodiazepine || undefined}
    >
      <span aria-hidden="true" className="intake-card-glass">
        <span className="intake-card-ink" data-intake-ink />
      </span>
      <IntakeCardShine seed={entry.id} eligible={shineEligible} />
      <div className="intake-card-content">
        <span className="intake-card-focus" aria-hidden="true">
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
            {isBenzodiazepine && (
              <span className="intake-card-benzo-dot" data-intake-benzo-dot />
            )}
          </span>
        </span>
        <div className="intake-card-details">
          <div className="intake-card-heading" data-intake-heading>
            <time
              className="intake-card-time"
              dateTime={entry.takenAt}
              title={`${time}${nextMorning ? " · next morning" : ""}`}
              data-intake-time
            >
              {time}
              {nextMorning && <span className="sr-only">, next morning</span>}
            </time>
            <span className="intake-card-heading-dot" aria-hidden="true" />
            <h3
              className="intake-card-name"
              title={entry.medicationName}
              data-intake-name
            >
              {entry.medicationName}
            </h3>
          </div>
          <div className="intake-card-bottom" data-intake-bottom>
            <div className="intake-card-meta">
              <span
                className="intake-card-ingredient"
                data-intake-ingredient
                data-unset={!ingredient || undefined}
                title={ingredient || "Active ingredient not set"}
              >
                {ingredient || "Not Set"}
              </span>
              <span className="intake-card-dose-group">
                <span className="intake-card-meta-slash" aria-hidden="true">
                  /
                </span>
                <span className="intake-card-amount" data-intake-dose>
                  {formatDose(entry.quantity)}
                  {isMeteredMedicationType(type)
                    ? ` ${entry.quantity === 1 ? units.unit : units.units}`
                    : ""}{" "}
                  × {formatDose(entry.strengthMg)}
                  {"\u00a0"}mg
                </span>
              </span>
            </div>
            {isBenzodiazepine && (
              <BenzodiazepineBadge className="intake-card-benzo" />
            )}
          </div>
          {entry.note && (
            <p className="intake-card-note" data-intake-note>
              {entry.note}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
