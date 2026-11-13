import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { MedicationGlyph } from "@/components/medication-icon";
import { MedicationFormGlyph } from "@/components/medication-form-glyph";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationIconStack } from "@/lib/medication-icon-stack";
import {
  getMedicationColorScale,
  getMedicationIconPigment,
  getMedicationPreviewSurface,
} from "@/lib/medication-preview-colors";
import {
  getMedicationType,
  MEDICATION_TYPE_VALUES,
  type MedicationType,
} from "@/lib/medication-types";
import { cn } from "@/lib/utils";
import styles from "./medication-card-icon.module.css";

type MedicationArtworkProps = {
  color?: string;
  icon?: string;
  iconRotation?: number;
};

/** Mark-only artwork lets every decorative fan layer share the saved identity. */
function MedicationCardMark({
  color: value,
  icon,
  iconRotation = 0,
}: MedicationArtworkProps) {
  const color = getMedicationColor(value);
  const scale = getMedicationColorScale(color.value);
  const pigment = getMedicationIconPigment(color.value, icon);

  return (
    <span
      className="medication-card-mark intake-card-mark"
      data-medication-mark
      data-medication-color={color.value}
      style={
        {
          color: scale.icon,
          backgroundColor:
            getMedicationPreviewSurface(pigment) ?? "var(--popover)",
          "--medication-rotation": `${iconRotation}deg`,
        } as CSSProperties
      }
    >
      <MedicationGlyph icon={icon} className="size-7" />
    </span>
  );
}

/** The form is separate from the saved appearance and never scales with a fan. */
export function MedicationFormBadge({
  form,
  hasIndicators,
}: {
  form?: MedicationType;
  hasIndicators: boolean;
}) {
  const normalized =
    form && MEDICATION_TYPE_VALUES.includes(form) ? form : "other";
  return (
    <span
      className={styles.formBadge}
      aria-hidden="true"
      title={
        form === normalized
          ? getMedicationType(normalized).label
          : "Medication type not set"
      }
      data-intake-form-badge={normalized}
      data-medication-form-badge={normalized}
      data-has-indicators={hasIndicators}
    >
      <MedicationFormGlyph
        form={normalized}
        strokeWidth={2}
        className={styles.formGlyph}
      />
    </span>
  );
}

/** Shared, non-interactive single frame for a history stack or appearance hero. */
export function MedicationCardIcon({
  color: value,
  icon,
  iconRotation = 0,
  className,
  style,
  badge,
  ...props
}: Omit<ComponentProps<"span">, "color"> &
  MedicationArtworkProps & { badge?: ReactNode }) {
  const color = getMedicationColor(value);

  return (
    <span
      {...props}
      className={cn("medication-card-focus intake-card-focus", className)}
      aria-hidden="true"
      data-medication-card-icon
      style={
        {
          "--entry-color": color.hex,
          "--entry-icon-tint": `${color.hex}66`,
          ...style,
        } as CSSProperties
      }
    >
      <MedicationCardMark
        color={color.value}
        icon={icon}
        iconRotation={iconRotation}
      />
      {badge}
    </span>
  );
}

/**
 * A quantity fan is one stable animated icon. The decorative copies have no
 * entrance classes, state, loading effects or mounts tied to group disclosure.
 */
export function MedicationCardIconStack({
  color: value,
  icon,
  iconRotation = 0,
  quantity,
  badge,
}: MedicationArtworkProps & { quantity: number; badge?: ReactNode }) {
  const color = getMedicationColor(value);
  const stack = getMedicationIconStack(quantity);

  return (
    <span
      className={cn("medication-card-focus intake-card-focus", styles.stack)}
      aria-hidden="true"
      data-medication-card-icon
      data-medication-icon-stack
      data-icon-count={stack.count}
      data-icon-layer-count={stack.layers.length}
      style={
        {
          "--entry-color": color.hex,
          "--entry-icon-tint": `${color.hex}66`,
          "--icon-stack-width": `${stack.width}px`,
          "--icon-stack-rail-width": `${stack.rail.width}px`,
          "--icon-stack-scale": stack.rail.scale,
          "--icon-front-left": `${(stack.rail.width - stack.width * stack.rail.scale) / 2}px`,
        } as CSSProperties
      }
    >
      <span className={styles.stage} data-medication-icon-fan>
        {stack.layers.map((layer) => (
          <span
            key={layer.index}
            className={styles.layer}
            data-medication-icon-layer={layer.index}
            style={{
              left: layer.left,
              top: layer.top,
              opacity: layer.opacity,
              transform: `scale(${layer.scale})`,
              zIndex: stack.layers.length - layer.index,
            }}
          >
            <MedicationCardMark
              color={color.value}
              icon={icon}
              iconRotation={iconRotation}
            />
          </span>
        ))}
      </span>
      {badge}
    </span>
  );
}
