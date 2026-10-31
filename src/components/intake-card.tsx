"use client";

import type { CSSProperties } from "react";
import { APP_COLORS } from "@/lib/app-theme";
import {
  MEDICATION_CLASS_MARKERS,
  MedicationClassIcon,
} from "@/components/medication-class-badge";
import { IntakeCardShine } from "@/components/intake-card-shine";
import {
  MedicationGlyph,
  MedicationTypeIcon,
} from "@/components/medication-icon";
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
import {
  getMedicationClasses,
  getMedicationClassification,
} from "@/lib/medication-classification";

const benzoColors = {
  outline: getMedicationColor("tw-rose-400").hex,
  background: getMedicationColor("tw-rose-200").hex,
  overlay: getMedicationColor("tw-pink-700").hex,
  foreground: getMedicationColor("tw-fuchsia-800").hex,
  border: getMedicationColor("tw-rose-800").hex,
};

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
  const amber = getMedicationColor("tw-amber-500").hex;
  const amberSoft = getMedicationColor("tw-amber-300").hex;
  const amberInk = getMedicationColor("tw-amber-700").hex;
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
  const classes = getMedicationClasses(medication);
  const isBenzodiazepine = classes.includes("benzodiazepine");
  const isOpioid = classes.includes("opioid");
  const ingredient = medication?.activeIngredient?.trim();
  const totalMg = formatDose(doseMg(entry));

  const style = {
    "--entry-color": color.hex,
    "--entry-rim-color": `${color.hex}1f`,
    "--entry-icon-tint": `${color.hex}66`,
    "--entry-benzo-soft": `${benzoColors.background}99`,
    "--entry-benzo-overlay": `${benzoColors.overlay}4d`,
    "--entry-benzo-ink": benzoColors.foreground,
    "--entry-benzo-edge": `${benzoColors.foreground}59`,
    "--entry-benzo-edge-overlay": `${benzoColors.border}66`,
    "--entry-class-border": `${color.hex}59`,
    "--entry-benzo-border": `${benzoColors.outline}99`,
    "--entry-opioid": amber,
    "--entry-opioid-soft": amberSoft,
    "--entry-opioid-ink": amberInk,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${entry.medicationName}${classes.map((kind) => `, ${MEDICATION_CLASS_MARKERS[kind].accessibleLabel.toLowerCase()}`).join("")}, ${hasType ? typeLabel : "medication type not set"}, ${ingredient ? `active ingredient ${ingredient}` : "active ingredient not set"}, ${totalMg} milligrams, ${time}${nextMorning ? ", next morning" : ""}`}
      className="intake-log-card"
      style={style}
      data-intake-card={entry.id}
      data-shine-eligible={shineEligible}
      data-benzodiazepine={isBenzodiazepine || undefined}
      data-opioid={isOpioid || undefined}
      data-medication-classification={getMedicationClassification(medication)}
      data-light-accent={
        getMedicationPreviewSurface(color.hex) === APP_COLORS.ink || undefined
      }
    >
      <span aria-hidden="true" className="intake-card-glass">
        <span className="intake-card-pattern" data-intake-pattern />
        <span className="intake-card-ink" data-intake-ink />
        <span className="intake-card-readability" data-intake-readability />
        <span className="intake-card-color-wash" data-intake-color-overlay />
        <span className="intake-card-tone" data-intake-tone />
      </span>
      <IntakeCardShine seed={entry.id} eligible={shineEligible} />
      {classes.length > 0 && (
        <span
          className="intake-card-class-rim"
          aria-hidden="true"
          data-intake-benzo-rim={isBenzodiazepine || undefined}
          data-intake-class-rim
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
            {isOpioid && (
              <span
                className="intake-card-opioid-dot"
                data-medication-class="opioid"
                data-intake-opioid-dot
              />
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
                <MedicationTypeIcon type={type ?? "other"} className="size-3" />
                <span className="intake-card-type-label">{typeLabel}</span>
              </span>
              {classes.map((kind) => (
                <MedicationClassIcon
                  key={kind}
                  kind={kind}
                  className={`intake-card-class-icon${kind === "benzodiazepine" ? " intake-card-benzo-icon" : " intake-card-opioid-icon"}`}
                  data-intake-benzo-icon={
                    kind === "benzodiazepine" || undefined
                  }
                  data-intake-opioid-icon={kind === "opioid" || undefined}
                />
              ))}
            </span>
          </div>
          <div className="intake-card-bottom" data-intake-bottom>
            <div className="intake-card-ingredient-group">
              <span
                className="intake-card-ingredient"
                data-intake-ingredient
                data-unset={!ingredient || undefined}
                title={ingredient || "Active ingredient not set"}
              >
                {ingredient || "Not Set"}
              </span>
              {ingredient && (
                <span className="intake-card-ingredient-context">
                  <span aria-hidden="true">/</span>
                  <span>Active Substance</span>
                </span>
              )}
            </div>
            <div className="intake-card-dose-group">
              <span className="intake-card-amount" data-intake-dose>
                {formatDose(entry.quantity)}
                {isMeteredMedicationType(type)
                  ? ` ${entry.quantity === 1 ? units.unit : units.units}`
                  : ""}{" "}
                × {formatDose(entry.strengthMg)}
                <span className="intake-card-mg">{"\u00a0"}mg</span>
              </span>
              <span
                className="intake-card-total"
                data-intake-total
                data-total-long={totalMg.length > 15 || undefined}
              >
                <span
                  className="intake-card-total-value"
                  data-intake-total-value
                >
                  {totalMg}
                </span>
                <span className="intake-card-total-unit">mg</span>
              </span>
            </div>
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
