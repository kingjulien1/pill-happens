import { MedicationClassBadges } from "@/components/medication-class-badge";
import { MedicationCategoryIcon } from "@/components/medication-category-icon";
import {
  getMedicationCategories,
  getMedicationCategory,
  type MedicationCategoryMetadata,
} from "@/lib/medication-categories";

/** General labels stay quiet; priority medication markers keep their own color. */
export function MedicationCategoryBadges({
  medication,
  maxGeneral = 2,
  showPriority = true,
}: {
  medication?: MedicationCategoryMetadata;
  maxGeneral?: number;
  /** Shared cards already show their Benzo, Opioid and Stimulant indicators. */
  showPriority?: boolean;
}) {
  const categories = getMedicationCategories(medication);
  const general = categories.filter(
    (value) =>
      value !== "benzodiazepine" && value !== "opioid" && value !== "stimulant",
  );
  const extra = general.slice(maxGeneral);
  if (!general.length && (!showPriority || !categories.length)) return null;
  return (
    <span
      className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1"
      data-medication-category-badges
    >
      {showPriority && <MedicationClassBadges medication={medication} />}
      {general.slice(0, maxGeneral).map((category) => {
        const item = getMedicationCategory(category);
        return (
          <span
            key={category}
            title={item.label}
            data-medication-category={category}
            className="inline-flex max-w-[140px] items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] leading-3 text-muted-foreground"
          >
            <MedicationCategoryIcon category={category} className="size-2.5" />
            <span className="min-w-0 truncate">{item.shortLabel}</span>
          </span>
        );
      })}
      {extra.length > 0 && (
        <span
          className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] leading-3 text-muted-foreground"
          title={extra
            .map((value) => getMedicationCategory(value).label)
            .join(", ")}
        >
          +{extra.length}
          <span className="sr-only">
            {" "}
            more categories:{" "}
            {extra
              .map((value) => getMedicationCategory(value).label)
              .join(", ")}
          </span>
        </span>
      )}
    </span>
  );
}
