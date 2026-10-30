import {
  medicationCategoryFlags,
  normalizeMedicationCategories,
  type MedicationCategory,
} from "@/lib/medication-categories";

type CategoryMetadata = {
  categories?: readonly MedicationCategory[];
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
};

/**
 * An explicit selection wins over stale legacy flags. A legacy flag-only edit
 * changes that label on a categorized record without losing its other labels.
 * Unrelated edits leave absent legacy metadata absent; no read migration occurs.
 */
export function resolveMedicationCategoryPatch(
  current: CategoryMetadata | undefined,
  patch: CategoryMetadata,
): {
  categories?: MedicationCategory[];
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
} {
  if (patch.categories !== undefined) {
    const categories = normalizeMedicationCategories(patch.categories);
    return { categories, ...medicationCategoryFlags(categories) };
  }
  if (
    current?.categories === undefined ||
    (patch.isBenzodiazepine === undefined && patch.isOpioid === undefined)
  )
    return {};

  const categories = new Set(current.categories);
  for (const [flag, category] of [
    ["isBenzodiazepine", "benzodiazepine"],
    ["isOpioid", "opioid"],
  ] as const) {
    if (patch[flag] === true) categories.add(category);
    if (patch[flag] === false) categories.delete(category);
  }
  const selection = normalizeMedicationCategories([...categories]);
  return { categories: selection, ...medicationCategoryFlags(selection) };
}
