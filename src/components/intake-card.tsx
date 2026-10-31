"use client";

import {
  MEDICATION_CLASS_MARKERS,
  MedicationClassIcon,
} from "@/components/medication-class-badge";
import { IntakeCardShine } from "@/components/intake-card-shine";
import { MedicationCardBase } from "@/components/medication-card-base";
import {
  medicationCardPriority,
  MedicationCardOpioidDot,
  MedicationCardPriorityRim,
} from "@/components/medication-card-priority";
import {
  doseMg,
  formatDose,
  toLocalInput,
  type Intake,
  type Medication,
} from "@/lib/domain";
import {
  getMedicationType,
  isMeteredMedicationType,
  MEDICATION_TYPE_VALUES,
} from "@/lib/medication-types";

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
  const type = entry.medicationForm ?? medication?.form;
  const hasType = type !== undefined && MEDICATION_TYPE_VALUES.includes(type);
  const units = getMedicationType(type) ?? getMedicationType();
  const typeLabel = hasType ? units.label : "Medicine";
  const localTime = toLocalInput(entry.takenAt, timeZone);
  const time = localTime.slice(11);
  const nextMorning = localTime.slice(0, 10) !== day;
  const priority = medicationCardPriority(medication);
  const { classes, benzo: isBenzodiazepine, opioid: isOpioid } = priority;
  const ingredient = medication?.activeIngredient?.trim();
  const totalMg = formatDose(doseMg(entry));

  return (
    <MedicationCardBase
      color={medication?.color}
      icon={medication?.icon}
      iconRotation={medication?.iconRotation}
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${entry.medicationName}${classes.map((kind) => `, ${MEDICATION_CLASS_MARKERS[kind].accessibleLabel.toLowerCase()}`).join("")}, ${hasType ? typeLabel : "medication type not set"}, ${ingredient ? `active ingredient ${ingredient}` : "active ingredient not set"}, ${totalMg} milligrams, ${time}${nextMorning ? ", next morning" : ""}`}
      style={priority.style}
      data-intake-card={entry.id}
      data-shine-eligible={shineEligible}
      data-benzodiazepine={isBenzodiazepine || undefined}
      data-opioid={isOpioid || undefined}
      data-medication-classification={priority.classification}
      decoration={
        <>
          <IntakeCardShine seed={entry.id} eligible={shineEligible} />
          <MedicationCardPriorityRim
            marked={classes.length > 0}
            benzo={isBenzodiazepine}
          />
        </>
      }
      iconDecoration={<MedicationCardOpioidDot present={isOpioid} />}
    >
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
              className="intake-card-type-text"
              title={hasType ? typeLabel : "Medication Type Not Set"}
              data-intake-type
            >
              {typeLabel}
            </span>
            {classes.map((kind) => (
              <MedicationClassIcon
                key={kind}
                kind={kind}
                className={`intake-card-class-icon${kind === "benzodiazepine" ? " intake-card-benzo-icon" : " intake-card-opioid-icon"}`}
                data-intake-benzo-icon={kind === "benzodiazepine" || undefined}
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
              title={ingredient || "Active substance not specified"}
            >
              {ingredient || "Unspecified"}
            </span>
            <span className="intake-card-ingredient-context">
              <span aria-hidden="true">/</span>
              <span>Active Substance</span>
            </span>
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
              <span className="intake-card-total-value" data-intake-total-value>
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
    </MedicationCardBase>
  );
}
