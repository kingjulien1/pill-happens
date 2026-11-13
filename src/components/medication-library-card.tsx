"use client";

import { MedicationCard } from "@/components/medication-card";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { formatDose, type Medication } from "@/lib/domain";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
import { getMedicationType } from "@/lib/medication-types";

/** Saved defaults use exactly the same two-row composition as actual intakes. */
export function MedicationLibraryCard({
  medication,
  onEdit,
  disabled = false,
}: {
  medication: Medication;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const type = getMedicationType(medication.form);
  const ingredient = medication.activeIngredient?.trim();
  const strength = formatDose(medication.strengthMg);
  const categories = getMedicationCategories(medication);
  const quantity = medication.defaultQuantity ?? 1;
  const label = [
    `Edit ${medication.name}`,
    `${strength} milligrams per ${type.unit}`,
    `default intake quantity ${formatDose(quantity)}`,
    type.label,
    ingredient ? `active substance ${ingredient}` : "active substance not set",
    categories.length
      ? `categories: ${categories.map((category) => getMedicationCategory(category).label).join(", ")}`
      : null,
    medication.archived ? "archived" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <MedicationCard
      medication={medication}
      name={medication.name}
      form={medication.form}
      ingredient={ingredient}
      quantity={quantity}
      className="medication-library-card"
      onClick={onEdit}
      disabled={disabled}
      aria-label={label}
      aria-haspopup="dialog"
      data-card-entry
      data-medication-library-card={medication.id}
      data-medication-archived={medication.archived || undefined}
      leading={
        <span
          className="intake-card-time medication-library-default"
          data-medication-default-label
        >
          Default
        </span>
      }
      trailing={
        <MedicationCardDose
          quantity={quantity}
          strengthMg={medication.strengthMg}
          form={medication.form}
          source="default"
        />
      }
    />
  );
}
