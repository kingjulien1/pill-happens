import {
  getMedicationCategories,
  type MedicationCategoryMetadata,
} from "./medication-categories";

export type MedicationClassification =
  "unmarked" | "benzodiazepine" | "opioid" | "both";

export type MedicationClass = "benzodiazepine" | "opioid";

type ClassificationFlags = MedicationCategoryMetadata;

export const MEDICATION_CLASSIFICATIONS = [
  {
    value: "unmarked",
    label: "Not Marked",
    description: "No medication class label.",
  },
  {
    value: "benzodiazepine",
    label: "Benzo",
    description: "Marked as a benzodiazepine in your journal.",
  },
  {
    value: "opioid",
    label: "Opioid",
    description: "Marked as an opioid in your journal.",
  },
  {
    value: "both",
    label: "Benzo + Opioid",
    description: "Both labels are marked independently in your journal.",
  },
] as const satisfies readonly {
  value: MedicationClassification;
  label: string;
  description: string;
}[];

/** Labels are user-entered metadata, never inferred from a name or ingredient. */
export function getMedicationClassification(
  medication?: ClassificationFlags | null,
): MedicationClassification {
  const categories = getMedicationCategories(medication);
  const benzo = categories.includes("benzodiazepine");
  const opioid = categories.includes("opioid");
  return benzo
    ? opioid
      ? "both"
      : "benzodiazepine"
    : opioid
      ? "opioid"
      : "unmarked";
}

/** A complete selection explicitly clears either label that is not selected. */
export function medicationClassificationFlags(
  value: MedicationClassification,
): {
  isBenzodiazepine: boolean;
  isOpioid: boolean;
} {
  return {
    isBenzodiazepine: value === "benzodiazepine" || value === "both",
    isOpioid: value === "opioid" || value === "both",
  };
}

/** Stable order keeps combined badges and markers consistent across screens. */
export function getMedicationClasses(
  medication?: ClassificationFlags | null,
): MedicationClass[] {
  const classes: MedicationClass[] = [];
  const categories = getMedicationCategories(medication);
  if (categories.includes("benzodiazepine")) classes.push("benzodiazepine");
  if (categories.includes("opioid")) classes.push("opioid");
  return classes;
}
