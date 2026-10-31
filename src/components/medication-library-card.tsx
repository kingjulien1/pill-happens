"use client";

import { MedicationCardBase } from "@/components/medication-card-base";
import {
  medicationCardPriority,
  MedicationCardOpioidDot,
  MedicationCardPriorityRim,
} from "@/components/medication-card-priority";
import { MedicationCategoryBadges } from "@/components/medication-category-badges";
import { MedicationTypeIcon } from "@/components/medication-icon";
import { MEDICATION_CLASS_MARKERS } from "@/components/medication-class-badge";
import { formatDose, type Medication } from "@/lib/domain";
import { getMedicationType } from "@/lib/medication-types";

/** Library content composes the same frame as an intake, with one edit action. */
export function MedicationLibraryCard({
  medication,
  onEdit,
  disabled = false,
}: {
  medication: Medication;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const priority = medicationCardPriority(medication);
  const type = getMedicationType(medication.form);
  const ingredient = medication.activeIngredient?.trim();
  return (
    <MedicationCardBase
      color={medication.color}
      icon={medication.icon}
      iconRotation={medication.iconRotation}
      className="medication-library-card"
      style={priority.style}
      onClick={onEdit}
      disabled={disabled}
      aria-label={`Edit ${medication.name}, ${formatDose(medication.strengthMg)} milligrams per ${type.unit}${priority.classes.map((kind) => `, ${MEDICATION_CLASS_MARKERS[kind].accessibleLabel.toLowerCase()}`).join("")}${medication.archived ? ", archived" : ""}`}
      aria-haspopup="dialog"
      data-medication-library-card={medication.id}
      data-benzodiazepine={priority.benzo || undefined}
      data-opioid={priority.opioid || undefined}
      data-medication-classification={priority.classification}
      data-medication-archived={medication.archived || undefined}
      decoration={
        <MedicationCardPriorityRim
          marked={priority.classes.length > 0}
          benzo={priority.benzo}
        />
      }
      iconDecoration={<MedicationCardOpioidDot present={priority.opioid} />}
    >
      <div className="medication-library-card-details">
        <div className="medication-library-card-heading">
          <h3 title={medication.name}>{medication.name}</h3>
          <span className="intake-card-type" title={type.label}>
            <MedicationTypeIcon type={medication.form} className="size-3" />
            <span className="intake-card-type-label">{type.label}</span>
          </span>
        </div>
        <div className="medication-library-card-meta">
          <span>
            {formatDose(medication.strengthMg)} mg / {type.unit}
          </span>
          {ingredient && <span title={ingredient}>{ingredient}</span>}
        </div>
        <MedicationCategoryBadges medication={medication} />
      </div>
    </MedicationCardBase>
  );
}
