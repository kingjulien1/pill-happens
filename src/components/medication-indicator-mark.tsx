import type { ComponentProps, CSSProperties } from "react";
import { Check, Tablets } from "lucide-react";
import { MedicationCategoryGlyph } from "@/components/medication-category-glyph";
import {
  MEDICATION_INDICATORS,
  MedicationIndicatorIcon,
} from "@/components/medication-indicator";
import {
  getMedicationCategory,
  type MedicationCategory,
} from "@/lib/medication-categories";
import { cn } from "@/lib/utils";
import styles from "./medication-indicator-mark.module.css";

/** A shared category, count or saved-state mark; size is the complete frame. */
export function MedicationIndicatorMark({
  kind,
  size,
  strokeWidth = 2.5,
  outline = false,
  className,
  style,
  ...props
}: Omit<ComponentProps<"span">, "children"> & {
  kind: MedicationCategory | "pills" | "check-in";
  size?: number;
  strokeWidth?: number;
  /** Intake rails use open strokes; other category tiles retain their glyphs. */
  outline?: boolean;
}) {
  const decorative =
    props["aria-hidden"] === true || props["aria-hidden"] === "true";
  const explicitSize = size !== undefined && Number.isFinite(size) && size >= 0;
  const priority =
    kind === "benzodiazepine" || kind === "opioid" || kind === "stimulant";
  return (
    <span
      {...props}
      className={cn(styles.mark, className)}
      style={
        {
          ...(explicitSize
            ? { "--medication-indicator-mark-size": `${size}px` }
            : {}),
          ...style,
        } as CSSProperties
      }
      role={decorative ? undefined : (props.role ?? "img")}
      aria-label={
        decorative
          ? undefined
          : (props["aria-label"] ??
            (kind === "pills"
              ? "Pills"
              : kind === "check-in"
                ? "Check-in saved"
                : priority
                  ? MEDICATION_INDICATORS[kind].accessibleLabel
                  : getMedicationCategory(kind).label))
      }
      data-medication-indicator-mark={kind}
      data-medication-indicator-framed
    >
      {kind === "check-in" ? (
        <Check
          size={16}
          strokeWidth={2.5}
          className={styles.glyph}
          aria-hidden="true"
          focusable="false"
          data-medication-indicator="check-in"
        />
      ) : kind === "pills" ? (
        <Tablets
          size={16}
          strokeWidth={2.5}
          className={styles.glyph}
          aria-hidden="true"
          focusable="false"
          data-medication-indicator="pills"
        />
      ) : priority ? (
        <MedicationIndicatorIcon
          kind={kind}
          size={16}
          strokeWidth={strokeWidth}
          className={styles.glyph}
          aria-hidden="true"
        />
      ) : (
        <MedicationCategoryGlyph
          category={kind}
          outline={outline}
          size={16}
          strokeWidth={strokeWidth}
          className={styles.glyph}
        />
      )}
    </span>
  );
}
