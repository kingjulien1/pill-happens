import type { ComponentProps, CSSProperties, ReactNode } from "react";
import {
  MedicationCardIcon,
  MedicationCardIconStack,
} from "@/components/medication-card-icon";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationIconPigment } from "@/lib/medication-preview-colors";
import { cn } from "@/lib/utils";
import styles from "./medication-card-base.module.css";
import frameStyles from "./card-frame.module.css";
import layoutStyles from "./card-layout.module.css";

export { MedicationCardIcon } from "@/components/medication-card-icon";

type MedicationCardBaseProps = Omit<ComponentProps<"button">, "color"> & {
  color?: string;
  icon?: string;
  iconRotation?: number;
  /** Actual/default quantity; omitted for standalone artwork and check-ins. */
  quantity?: number;
  /** Optional specialization slots; the frame contains no journal fields. */
  decoration?: ReactNode;
  /** Custom leading artwork keeps the shared card geometry and content slots. */
  leadingArtwork?: ReactNode;
  /** An unscaled overlay anchored to the leading medication artwork. */
  artworkBadge?: ReactNode;
  /** Saved intakes expose separate controls beside their native card action. */
  artworkControls?: ReactNode;
  /** Omit to retain the medication glass stack; provide custom paint for other cards. */
  background?: ReactNode;
};

/** One quiet selected-color tint; the artwork carries the medication identity. */
export function MedicationCardBackground() {
  return (
    <span
      aria-hidden="true"
      className="intake-card-glass"
      data-intake-surface
    />
  );
}

/** Shared color-and-glyph frame; names, doses and other content are composed. */
export function MedicationCardBase({
  color: value,
  icon,
  iconRotation = 0,
  quantity,
  decoration,
  leadingArtwork,
  artworkBadge,
  artworkControls,
  background,
  children,
  className,
  style,
  type = "button",
  ...props
}: MedicationCardBaseProps) {
  const color = getMedicationColor(value);
  const hasContent = children !== null && children !== undefined;

  const frameStyle = {
    "--entry-color": color.hex,
    "--entry-icon-tint": `${color.hex}66`,
    "--intake-identity-color": getMedicationIconPigment(color.value, icon),
    ...style,
  } as CSSProperties;
  const actionLabel =
    props["aria-label"] ?? (hasContent ? undefined : "Medication Icon");
  const content = (
    <>
      {background === undefined ? <MedicationCardBackground /> : background}
      {decoration}
      {/* Legacy aliases keep intake measurement and entrance hooks unchanged. */}
      <div className="medication-card-content intake-card-content">
        {leadingArtwork !== undefined ? (
          leadingArtwork
        ) : quantity === undefined ? (
          <MedicationCardIcon
            color={color.value}
            icon={icon}
            iconRotation={iconRotation}
            badge={artworkBadge}
          />
        ) : (
          <MedicationCardIconStack
            color={color.value}
            icon={icon}
            iconRotation={iconRotation}
            quantity={quantity}
            badge={artworkBadge}
          />
        )}
        {children}
      </div>
    </>
  );

  if (artworkControls !== undefined) {
    // Measurement, paint and reference hooks stay on the original direct card
    // root. Only interaction attributes belong to the native action button.
    const frameAttributes = Object.fromEntries(
      Object.entries(props).filter(
        ([name]) => name.startsWith("data-") || name === "id",
      ),
    );
    const actionAttributes = Object.fromEntries(
      Object.entries(props).filter(
        ([name]) => !name.startsWith("data-") && name !== "id",
      ),
    ) as typeof props;
    return (
      <div
        {...frameAttributes}
        className={cn(
          "medication-card-base intake-log-card",
          frameStyles.card,
          layoutStyles.card,
          styles.separateAction,
          className,
        )}
        style={frameStyle}
        tabIndex={-1}
        aria-disabled={props.disabled || undefined}
        data-medication-card-base
        data-card-empty={!hasContent || undefined}
      >
        <button
          {...actionAttributes}
          type={type}
          className={styles.cardAction}
          aria-label={actionLabel}
          data-intake-card-action
        >
          {content}
        </button>
        {artworkControls}
      </div>
    );
  }

  return (
    <button
      {...props}
      type={type}
      className={cn(
        "medication-card-base intake-log-card",
        frameStyles.card,
        layoutStyles.card,
        className,
      )}
      style={frameStyle}
      aria-label={actionLabel}
      data-medication-card-base
      data-card-empty={!hasContent || undefined}
    >
      {content}
    </button>
  );
}
