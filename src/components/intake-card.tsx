"use client";

import type { CSSProperties } from "react";
import { PillIcon } from "@phosphor-icons/react/dist/ssr/Pill";
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
  MEDICATION_TYPE_VALUES,
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
  const roseSoft = getMedicationColor("tw-rose-300").hex;
  const roseInk = getMedicationColor("tw-rose-600").hex;
  const svg = getSvgIcon(medication?.icon ?? "pill");
  const pigment =
    svg?.variant === "color" ? (svg.color?.hex ?? scale.icon) : scale.icon;
  const type = entry.medicationForm ?? medication?.form;
  const hasType = type !== undefined && MEDICATION_TYPE_VALUES.includes(type);
  const units = getMedicationType(type) ?? getMedicationType();
  const typeLabel = hasType ? units.label : "Medicine";
  const localTime = toLocalInput(entry.takenAt, timeZone);
  const time = localTime.slice(11);
  const nextMorning = localTime.slice(0, 10) !== day;
  const isBenzodiazepine = medication?.isBenzodiazepine === true;
  const ingredient = medication?.activeIngredient?.trim();

  const style = {
    "--entry-color": color.hex,
    "--entry-rim-color": `${color.hex}1f`,
    "--entry-icon-tint": `${color.hex}66`,
    "--entry-benzo": rose,
    "--entry-benzo-soft": roseSoft,
    "--entry-benzo-ink": roseInk,
    "--entry-benzo-border": `${color.hex}59`,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${entry.medicationName}${isBenzodiazepine ? ", benzodiazepine" : ""}, ${hasType ? typeLabel : "medication type not set"}, ${ingredient ? `active ingredient ${ingredient}` : "active ingredient not set"}, ${formatDose(doseMg(entry))} milligrams, ${time}${nextMorning ? ", next morning" : ""}`}
      className="intake-log-card"
      style={style}
      data-intake-card={entry.id}
      data-shine-eligible={shineEligible}
      data-benzodiazepine={isBenzodiazepine || undefined}
      data-light-accent={
        getMedicationPreviewSurface(color.hex) === "#18181b" || undefined
      }
    >
      <span aria-hidden="true" className="intake-card-glass">
        <span className="intake-card-pattern" data-intake-pattern />
        <span className="intake-card-ink" data-intake-ink />
        <span className="intake-card-readability" data-intake-readability />
        <span className="intake-card-color-wash" data-intake-color-overlay />
      </span>
      <IntakeCardShine seed={entry.id} eligible={shineEligible} />
      {isBenzodiazepine && (
        <span
          className="intake-card-benzo-rim"
          aria-hidden="true"
          data-intake-benzo-rim
        />
      )}
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
            <h3
              className="intake-card-name"
              title={entry.medicationName}
              data-intake-name
            >
              {entry.medicationName}
            </h3>
            <span className="intake-card-tags">
              <span
                className="intake-card-type"
                title={hasType ? typeLabel : "Medication Type Not Set"}
                data-intake-type
              >
                {typeLabel}
              </span>
              {isBenzodiazepine && (
                <span
                  className="intake-card-benzo-icon"
                  role="img"
                  aria-label="Benzodiazepine"
                  title="Benzodiazepine"
                  data-intake-benzo-icon
                >
                  <PillIcon
                    weight="duotone"
                    size={12}
                    aria-hidden="true"
                    focusable="false"
                  />
                </span>
              )}
            </span>
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
                  <span className="intake-card-mg">{"\u00a0"}mg</span>
                </span>
              </span>
            </div>
            <span className="intake-card-total" data-intake-total>
              <span className="intake-card-total-value" data-intake-total-value>
                {formatDose(doseMg(entry))}
              </span>
              <span className="intake-card-total-unit">mg</span>
            </span>
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
