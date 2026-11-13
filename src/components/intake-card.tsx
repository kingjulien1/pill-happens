"use client";

import { IntakeCardShine } from "@/components/intake-card-shine";
import { MedicationCard } from "@/components/medication-card";
import { MedicationCardDose } from "@/components/medication-card-dose";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
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

/** An actual intake adds time, recorded amounts and its rare shine to the shared card. */
export function IntakeCard({
  entry,
  medication,
  day,
  timeZone,
  onEdit,
  disabled = false,
  shineEligible = true,
  actionLabel,
  controls,
  expanded,
}: {
  entry: Intake;
  medication?: Medication;
  day: string;
  timeZone: string;
  onEdit: () => void;
  disabled?: boolean;
  shineEligible?: boolean;
  actionLabel?: string;
  controls?: string;
  expanded?: boolean;
}) {
  const type = entry.medicationForm ?? medication?.form;
  const hasType = type !== undefined && MEDICATION_TYPE_VALUES.includes(type);
  const units = getMedicationType(type) ?? getMedicationType();
  const typeLabel = hasType ? units.label : "Medicine";
  const localTime = toLocalInput(entry.takenAt, timeZone);
  const time = localTime.slice(11);
  const nextMorning = localTime.slice(0, 10) !== day;
  const classes = getMedicationCategories(medication);
  const ingredient = medication?.activeIngredient?.trim();
  const totalMg = formatDose(doseMg(entry));
  const calculation = `${formatDose(entry.quantity)}${
    isMeteredMedicationType(type)
      ? ` ${entry.quantity === 1 ? units.unit : units.units}`
      : ""
  } × ${formatDose(entry.strengthMg)} mg`;

  return (
    <MedicationCard
      medication={medication}
      name={entry.medicationName}
      form={type}
      formPresentation="icon"
      ingredient={ingredient}
      quantity={entry.quantity}
      onClick={onEdit}
      disabled={disabled}
      aria-label={
        actionLabel ??
        `Edit ${entry.medicationName}${classes.map((kind) => `, ${getMedicationCategory(kind).label.toLowerCase()}`).join("")}, ${hasType ? typeLabel : "medication type not set"}, ${ingredient ? `active ingredient ${ingredient}` : "active ingredient not set"}, ${calculation}, ${totalMg} milligrams total, ${time}${nextMorning ? ", next morning" : ""}`
      }
      aria-controls={controls}
      aria-expanded={expanded}
      data-intake-card={entry.id}
      data-intake-card-action
      data-shine-eligible={shineEligible}
      decoration={<IntakeCardShine seed={entry.id} eligible={shineEligible} />}
      leading={
        <time
          className="intake-card-time"
          dateTime={entry.takenAt}
          title={`${time}${nextMorning ? " · next morning" : ""}`}
          data-intake-time
        >
          {time}
          {nextMorning && <span className="sr-only">, next morning</span>}
        </time>
      }
      trailing={
        <MedicationCardDose
          quantity={entry.quantity}
          strengthMg={entry.strengthMg}
          form={type}
        />
      }
    />
  );
}
