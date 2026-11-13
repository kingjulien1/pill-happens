import type { CSSProperties } from "react";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { MedicationCategory } from "@/lib/medication-categories";
import { cn } from "@/lib/utils";

/** Neutral sizing preserves utility classes; the shared mark paints one tile. */
export function MedicationCategoryIcon({
  category,
  className,
}: {
  category: MedicationCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-[var(--medication-indicator-mark-size,22px)] shrink-0",
        className,
      )}
      aria-hidden="true"
    >
      <MedicationIndicatorMark
        kind={category}
        aria-hidden="true"
        style={{ "--medication-indicator-mark-size": "100%" } as CSSProperties}
      />
    </span>
  );
}
