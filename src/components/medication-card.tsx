import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { Badge } from "@/components/ui/badge";
import type { ComponentProps, ReactNode } from "react";
import { MedicationCardBase } from "@/components/medication-card-base";
import { MedicationQuantityBadge } from "@/components/medication-card-icon";
import { MedicationFormGlyph } from "@/components/medication-form-glyph";
import { IntakeRouteIcon } from "@/components/intake-route-icon";
import { INTAKE_ROUTES, type IntakeRoute } from "@/lib/intake-routes";
import { cn } from "@/lib/utils";
import styles from "./medication-card.module.css";
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

/** Display-only identity; snapshots need no record IDs or creation timestamps. */
type MedicationCardIdentity = Pick<
  Medication,
  | "activeIngredient"
  | "defaultQuantity"
  | "form"
  | "color"
  | "icon"
  | "iconRotation"
  | "categories"
  | "isBenzodiazepine"
  | "isOpioid"
>;

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
  medication?: MedicationCardIdentity;
  name: string;
  form?: Medication["form"];
  ingredient?: string;
  /** Recorded time or an explicitly labeled default, before the medication name. */
  leading?: ReactNode;
  /** A recorded or default dose in the shared second-row amount region. */
  trailing?: ReactNode;
  decoration?: ReactNode;
  /** Recorded routes remain distinct from a medication's physical form. */
  intakeRoute?: IntakeRoute;
  /** Library forms use a small label; recorded intakes use the outline rail. */
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
  intakeRoute,
  className,
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
      className={cn(styles.card, className)}
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
          <MedicationQuantityBadge
            quantity={quantity}
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
          data-has-indicators={
            indicators.length > 0 || formPresentation === "icon"
          }
        >
          {leading}
          <div className="intake-card-title-group" data-intake-title-group>
            <h3 className="intake-card-name" title={name} data-intake-name>
              {name}
            </h3>
          </div>
          {(indicators.length > 0 || formPresentation === "icon") && (
            <span
              className={cn("intake-card-tags", styles.rail)}
              data-medication-indicators
            >
              {formPresentation === "icon" && (
                <>
                  <span className={styles.intakeTypes}>
                    <span
                      className={styles.route}
                      title={
                        INTAKE_ROUTES.find(
                          (route) =>
                            route.value === (intakeRoute ?? "unspecified"),
                        )?.label
                      }
                    >
                      <IntakeRouteIcon route={intakeRoute} strokeWidth={2.5} />
                    </span>
                    <span className={styles.form} title={typeLabel}>
                      <MedicationFormGlyph
                        form={form ?? "other"}
                        strokeWidth={2.5}
                      />
                    </span>
                  </span>
                  {indicators.length > 0 && (
                    <span className={styles.railDot} aria-hidden="true">
                      ·
                    </span>
                  )}
                </>
              )}
              {indicators.map((kind) => (
                <MedicationIndicatorMark
                  key={kind}
                  kind={kind}
                  title={getMedicationCategory(kind).label}
                  strokeWidth={2.5}
                  outline
                  className="intake-card-indicator"
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
              <Badge
                variant="secondary"
                className={cn("intake-card-type-text", styles.typeBadge)}
                title={hasType ? typeLabel : "Medication Type Not Set"}
                data-intake-type
              >
                <MedicationFormGlyph form={form ?? "other"} strokeWidth={2.2} />
                <span className={styles.typeLabel}>{typeLabel}</span>
              </Badge>
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
