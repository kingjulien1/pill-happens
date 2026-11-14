import { MedicationClassBadges } from "@/components/medication-class-badge";
import { MedicationCategoryIcon } from "@/components/medication-category-icon";
import { MedicationCategoryGlyph } from "@/components/medication-category-glyph";
import {
  getMedicationIndicatorKinds,
  MEDICATION_INDICATORS,
  MedicationIndicatorIcon,
} from "@/components/medication-indicator";
import { Badge } from "@/components/ui/badge";
import {
  getMedicationCategories,
  getMedicationCategory,
  type MedicationCategoryMetadata,
} from "@/lib/medication-categories";
import styles from "./medication-category-badges.module.css";

/** General labels stay quiet; priority medication markers keep their own color. */
export function MedicationCategoryBadges({
  medication,
  maxGeneral = 2,
  showPriority = true,
  presentation = "default",
}: {
  medication?: MedicationCategoryMetadata;
  maxGeneral?: number;
  /** Shared cards already show their Benzo, Opioid and Stimulant indicators. */
  showPriority?: boolean;
  /** The medication editor uses roomier badges with plain foreground glyphs. */
  presentation?: "default" | "form";
}) {
  const categories = getMedicationCategories(medication);
  const general = categories.filter(
    (value) =>
      value !== "benzodiazepine" && value !== "opioid" && value !== "stimulant",
  );
  const extra = general.slice(maxGeneral);
  if (!general.length && (!showPriority || !categories.length)) return null;
  if (presentation === "form") {
    const visible = [
      ...(showPriority ? getMedicationIndicatorKinds(medication) : []),
      ...general.slice(0, maxGeneral),
    ];
    const extraLabels = extra.map(
      (value) => getMedicationCategory(value).label,
    );
    return (
      <span
        className={styles.summary}
        data-medication-category-badges
        data-category-badge-presentation="form"
      >
        {visible.map((category) => {
          const item = getMedicationCategory(category);
          const priority =
            category === "benzodiazepine" ||
            category === "opioid" ||
            category === "stimulant";
          return (
            <Badge
              key={category}
              variant="secondary"
              className={styles.badge}
              title={item.label}
              role={priority ? "img" : undefined}
              aria-label={
                priority
                  ? MEDICATION_INDICATORS[category].accessibleLabel
                  : undefined
              }
              data-medication-category={category}
              data-medication-class={priority ? category : undefined}
              data-priority={priority || undefined}
            >
              <span className={styles.icon} aria-hidden="true">
                {priority ? (
                  <MedicationIndicatorIcon kind={category} aria-hidden="true" />
                ) : (
                  <MedicationCategoryGlyph category={category} />
                )}
              </span>
              <span className={styles.label}>{item.shortLabel}</span>
            </Badge>
          );
        })}
        {extra.length > 0 && (
          <Badge
            variant="secondary"
            className={styles.badge}
            title={extraLabels.join(", ")}
            data-category-overflow
          >
            +{extra.length}
            <span className="sr-only">
              {" "}
              more categories: {extraLabels.join(", ")}
            </span>
          </Badge>
        )}
      </span>
    );
  }
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
