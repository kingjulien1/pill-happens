import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { MedicationGlyph } from "@/components/medication-icon";
import { MedicationFormGlyph } from "@/components/medication-form-glyph";
import { CardIconSettle } from "@/components/card-icon-settle";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationIconStack } from "@/lib/medication-icon-stack";
import {
  getMedicationColorScale,
  getMedicationIconPigment,
  getMedicationPreviewSurface,
  getMedicationFramePigment,
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

/** A text-sized version of the preview artwork; only its backplate is subdued. */
export function InlineMedicationMark({
  color: value,
  icon,
  iconRotation = 0,
}: MedicationArtworkProps) {
  const color = getMedicationColor(value);
  const pigment = getMedicationIconPigment(value, icon);
  return (
    <span
      aria-hidden="true"
      data-medication-mark
      className={styles.inlineMark}
      style={
        {
          "--mark-base":
            getMedicationPreviewSurface(pigment) ?? "var(--popover)",
          "--entry-icon-tint": `${color.hex}66`,
          "--medication-frame-pigment": getMedicationFramePigment(value),
          "--medication-rotation": `${iconRotation}deg`,
          color: getMedicationColorScale(value).icon,
        } as CSSProperties
      }
    >
      <MedicationGlyph icon={icon} className="size-4/5" />
    </span>
  );
}

/** The same selected-color glass frame hosts medication and check-in artwork. */
export function MedicationCardIconFrame({
  color: value,
  pigment,
  children,
  className,
  style,
  ...props
}: Omit<ComponentProps<"span">, "color"> & {
  color?: string;
  pigment?: string;
}) {
  const color = getMedicationColor(value);
  const scale = getMedicationColorScale(color.value);
  const identity = pigment ?? getMedicationIconPigment(color.value);

  return (
    <span
      {...props}
      className={cn(
        "medication-card-mark intake-card-mark",
        styles.mark,
        className,
      )}
      data-card-icon-frame
      data-medication-color={color.value}
      style={
        {
          color: scale.icon,
          backgroundColor:
            getMedicationPreviewSurface(identity) ?? "var(--popover)",
          "--medication-frame-pigment": getMedicationFramePigment(color.value),
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

/** Mark-only artwork lets every decorative fan layer share the saved identity. */
function MedicationCardMark({
  color,
  icon,
  iconRotation = 0,
}: MedicationArtworkProps) {
  return (
    <MedicationCardIconFrame
      color={color}
      pigment={getMedicationIconPigment(color, icon)}
      style={{ "--medication-rotation": `${iconRotation}deg` } as CSSProperties}
      data-medication-mark
    >
      <MedicationGlyph icon={icon} className="size-[30px]" />
    </MedicationCardIconFrame>
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

/** The recorded total stays independent of the decorative three-icon fan. */
export function MedicationQuantityBadge({
  quantity,
  hasIndicators,
}: {
  quantity: number;
  hasIndicators: boolean;
}) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity === 1)
    return null;
  const amount = String(quantity);
  const label = `×\u00a0${amount}`;
  return (
    <span
      className={styles.quantityBadge}
      aria-hidden="true"
      title={`${amount} total units`}
      data-intake-quantity={quantity}
      data-has-indicators={hasIndicators}
    >
      <span
        className={styles.quantityLabel}
        data-long={label.length > 9 || undefined}
      >
        {label}
      </span>
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
      <span className={styles.motion} data-medication-icon-motion>
        <MedicationCardMark
          color={color.value}
          icon={icon}
          iconRotation={iconRotation}
        />
      </span>
      <CardIconSettle />
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
          "--icon-front-left": `${stack.rail.frontLeft}px`,
        } as CSSProperties
      }
    >
      <span className={styles.motion} data-medication-icon-motion>
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
      </span>
      <CardIconSettle />
      {badge}
    </span>
  );
}
