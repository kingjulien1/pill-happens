import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { ComponentProps, ReactNode } from "react";
import { MedicationCardBase } from "@/components/medication-card-base";
import { MedicationFormBadge } from "@/components/medication-card-icon";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
import type { Medication } from "@/lib/domain";
import { getMedicationClassification } from "@/lib/medication-classification";
import {
  getMedicationType,
  MEDICATION_TYPE_VALUES,
} from "@/lib/medication-types";

type MedicationCardProps = Omit<
  ComponentProps<typeof MedicationCardBase>,
  | "children"
  | "color"
  | "icon"
  | "iconRotation"
  | "decoration"
  | "form"
  | "name"
  | "artworkBadge"
  | "artworkControls"
> & {
  medication?: Medication;
  name: string;
  form?: Medication["form"];
  ingredient?: string;
  /** Recorded time or an explicitly labeled default, before the medication name. */
  leading?: ReactNode;
  /** A recorded or default dose in the shared second-row amount region. */
  trailing?: ReactNode;
  decoration?: ReactNode;
  /** Intake forms use a compact artwork badge; library cards keep plain copy. */
  formPresentation?: "text" | "icon";
};

/** The same two single-line rows compose actual entries and saved medications. */
export function MedicationCard({
  medication,
  name,
  form = medication?.form,
  ingredient = medication?.activeIngredient,
  quantity = medication?.defaultQuantity ?? 1,
  leading,
  trailing,
  decoration,
  formPresentation = "text",
  ...props
}: MedicationCardProps) {
  const indicators = getMedicationCategories(medication);
  const hasType = form !== undefined && MEDICATION_TYPE_VALUES.includes(form);
  const typeLabel = hasType ? getMedicationType(form).label : "Medicine";
  const activeIngredient = ingredient?.trim();
  const ingredientUnset =
    !activeIngredient || activeIngredient.toLowerCase() === "unspecified";
  const hasLeading =
    leading !== undefined && leading !== null && leading !== false;

  return (
    <MedicationCardBase
      {...props}
      color={medication?.color}
      icon={medication?.icon}
      iconRotation={medication?.iconRotation}
      quantity={quantity}
      data-medication-card
      data-density="comfortable"
      data-benzodiazepine={indicators.includes("benzodiazepine") || undefined}
      data-opioid={indicators.includes("opioid") || undefined}
      data-stimulant={indicators.includes("stimulant") || undefined}
      data-medication-classification={getMedicationClassification(medication)}
      decoration={decoration}
      artworkBadge={
        formPresentation === "icon" ? (
          <MedicationFormBadge
            form={form}
            hasIndicators={indicators.length > 0}
          />
        ) : undefined
      }
    >
      <div
        className="medication-card-details intake-card-details"
        data-has-leading={hasLeading}
      >
        <div
          className="medication-card-heading intake-card-heading"
          data-intake-heading
          data-has-leading={hasLeading}
          data-has-indicators={indicators.length > 0}
        >
          {leading}
          <div className="intake-card-title-group" data-intake-title-group>
            <h3 className="intake-card-name" title={name} data-intake-name>
              {name}
            </h3>
          </div>
          {indicators.length > 0 && (
            <span
              className="intake-card-tags"
              data-medication-indicators
              dir="rtl"
            >
              {indicators.map((kind, index) => (
                <MedicationIndicatorMark
                  key={kind}
                  kind={kind}
                  title={getMedicationCategory(kind).label}
                  strokeWidth={2.5}
                  outline={formPresentation === "icon"}
                  className="intake-card-indicator"
                  style={
                    formPresentation === "icon"
                      ? undefined
                      : { zIndex: indicators.length - index }
                  }
                  data-medication-indicator-tile={kind}
                  data-intake-benzo-icon={
                    kind === "benzodiazepine" || undefined
                  }
                  data-intake-opioid-icon={kind === "opioid" || undefined}
                  data-intake-stimulant-icon={kind === "stimulant" || undefined}
                />
              ))}
            </span>
          )}
        </div>
        <div
          className="medication-card-bottom intake-card-bottom"
          data-intake-bottom
        >
          <div
            className="intake-card-ingredient-group"
            data-intake-substance-type
          >
            {formPresentation === "text" && (
              <span
                className="intake-card-type-text"
                title={hasType ? typeLabel : "Medication Type Not Set"}
                data-intake-type
              >
                {typeLabel}
              </span>
            )}
            <span
              className="intake-card-ingredient"
              data-intake-ingredient
              data-unset={ingredientUnset || undefined}
              title={activeIngredient || "Active substance not specified"}
            >
              {activeIngredient || "Unspecified"}
            </span>
          </div>
          {trailing}
        </div>
      </div>
    </MedicationCardBase>
  );
}
