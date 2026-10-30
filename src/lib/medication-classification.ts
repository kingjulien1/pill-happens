export type MedicationClassification =
  "unmarked" | "benzodiazepine" | "opioid" | "both";

export type MedicationClass = "benzodiazepine" | "opioid";

type ClassificationFlags = {
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
};

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
  const benzo = medication?.isBenzodiazepine === true;
  const opioid = medication?.isOpioid === true;
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
  if (medication?.isBenzodiazepine === true) classes.push("benzodiazepine");
  if (medication?.isOpioid === true) classes.push("opioid");
  return classes;
}
