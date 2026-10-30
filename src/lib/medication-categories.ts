/** Manual journal labels, independent of dosage form and never inferred. */
export const MEDICATION_CATEGORIES = [
  {
    value: "benzodiazepine",
    label: "Benzodiazepine",
    shortLabel: "Benzo",
    aliases: ["benzo", "benzodiazepines", "benzodiazepin"],
  },
  {
    value: "opioid",
    label: "Opioid / Opiate",
    shortLabel: "Opioid",
    aliases: ["opioids", "opiates", "opiate", "opioide"],
  },
  {
    value: "antidepressant",
    label: "Antidepressant",
    shortLabel: "Antidepressant",
    aliases: [
      "antidepressants",
      "antidepressiva",
      "anti depressiva",
      "anti depressant",
    ],
  },
  {
    value: "antipsychotic",
    label: "Antipsychotic",
    shortLabel: "Antipsychotic",
    aliases: [
      "antipsychotics",
      "anti psychotic",
      "antipsychotika",
      "neuroleptic",
      "neuroleptika",
    ],
  },
  {
    value: "sleep-aid",
    label: "Sleep Aid",
    shortLabel: "Sleep Aid",
    aliases: [
      "sleeping pill",
      "sleeping pills",
      "sleep medication",
      "sleeping tablets",
      "schlafmittel",
      "schlaftabletten",
    ],
  },
  {
    value: "stimulant",
    label: "Stimulant",
    shortLabel: "Stimulant",
    aliases: ["stimulants", "stimulanzien", "stimulanz", "stimulans"],
  },
  {
    value: "mood-stabilizer",
    label: "Mood Stabilizer",
    shortLabel: "Mood Stabilizer",
    aliases: ["mood stabiliser", "mood stabilizers", "stimmungsstabilisierer"],
  },
  {
    value: "pain-relief",
    label: "Pain Relief",
    shortLabel: "Pain Relief",
    aliases: ["painkiller", "analgesic", "schmerzmittel"],
  },
  {
    value: "anti-inflammatory",
    label: "Anti-Inflammatory",
    shortLabel: "Anti-Inflammatory",
    aliases: [
      "anti inflammatory",
      "antiinflammatory",
      "entzundungshemmer",
      "nsar",
      "nsaid",
    ],
  },
  {
    value: "allergy",
    label: "Allergy Medication",
    shortLabel: "Allergy",
    aliases: ["antihistamine", "allergie", "antiallergikum"],
  },
  {
    value: "digestive",
    label: "Stomach & Digestion",
    shortLabel: "Digestive",
    aliases: ["digestive", "stomach", "magen", "verdauung", "darm"],
  },
  {
    value: "thyroid",
    label: "Thyroid Medication",
    shortLabel: "Thyroid",
    aliases: ["schilddruse", "thyroid hormone"],
  },
  {
    value: "hormone",
    label: "Hormone Medication",
    shortLabel: "Hormone",
    aliases: ["hormones", "hormon", "hormone medication"],
  },
  {
    value: "cardiovascular",
    label: "Heart & Blood Pressure",
    shortLabel: "Heart & BP",
    aliases: ["cardiovascular", "heart", "blood pressure", "herz", "blutdruck"],
  },
  {
    value: "antibiotic",
    label: "Antibiotic",
    shortLabel: "Antibiotic",
    aliases: ["antibiotics", "antibiotika", "antibiotikum"],
  },
  {
    value: "anticonvulsant",
    label: "Anticonvulsant",
    shortLabel: "Anticonvulsant",
    aliases: [
      "anticonvulsants",
      "antiepileptic",
      "antiepileptika",
      "antikonvulsiva",
    ],
  },
  {
    value: "diabetes",
    label: "Diabetes Medication",
    shortLabel: "Diabetes",
    aliases: ["diabetic", "blood sugar", "blutzucker", "antidiabetika"],
  },
  {
    value: "supplement",
    label: "Vitamins & Supplements",
    shortLabel: "Supplement",
    aliases: [
      "supplements",
      "general supplements",
      "dietary supplements",
      "vitamin",
      "mineral",
      "nahrungserganzung",
      "supplemente",
    ],
  },
  {
    value: "other",
    label: "Other",
    shortLabel: "Other",
    aliases: ["other medication", "sonstige", "andere"],
  },
] as const;

export type MedicationCategory =
  (typeof MEDICATION_CATEGORIES)[number]["value"];
export const MEDICATION_CATEGORY_VALUES = MEDICATION_CATEGORIES.map(
  (item) => item.value,
);

export type MedicationCategoryMetadata = {
  categories?: readonly MedicationCategory[];
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
};

/** Fresh, deduplicated values in one stable order; unknown runtime IDs drop out. */
export function normalizeMedicationCategories(
  values: readonly MedicationCategory[],
): MedicationCategory[] {
  const selected = new Set(values);
  return MEDICATION_CATEGORY_VALUES.filter((value) => selected.has(value));
}

/** Explicit categories win, including an empty array; old flags remain readable. */
export function getMedicationCategories(
  medication?: MedicationCategoryMetadata | null,
): MedicationCategory[] {
  if (Array.isArray(medication?.categories))
    return normalizeMedicationCategories(medication.categories);
  return MEDICATION_CATEGORY_VALUES.filter((value) =>
    value === "benzodiazepine"
      ? medication?.isBenzodiazepine === true
      : value === "opioid" && medication?.isOpioid === true,
  );
}

/** Keep the established priority highlights aligned with explicit selections. */
export function medicationCategoryFlags(
  categories: readonly MedicationCategory[],
) {
  return {
    isBenzodiazepine: categories.includes("benzodiazepine"),
    isOpioid: categories.includes("opioid"),
  };
}

export function getMedicationCategory(value: MedicationCategory) {
  return MEDICATION_CATEGORIES.find((item) => item.value === value)!;
}

function searchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .trim();
}

export function filterMedicationCategories(query: string) {
  const words = searchText(query).split(/\s+/u).filter(Boolean);
  return MEDICATION_CATEGORIES.filter((item) => {
    const text = searchText(
      [item.value, item.label, item.shortLabel, ...item.aliases].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}
