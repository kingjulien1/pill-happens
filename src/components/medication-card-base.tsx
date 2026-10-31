import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { MedicationGlyph } from "@/components/medication-icon";
import { APP_COLORS } from "@/lib/app-theme";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getMedicationColorScale,
  getMedicationPreviewSurface,
} from "@/lib/medication-preview-colors";
import { getSvgIcon } from "@/lib/svg-icon-catalog";
import { cn } from "@/lib/utils";

type MedicationCardBaseProps = Omit<ComponentProps<"button">, "color"> & {
  color?: string;
  icon?: string;
  iconRotation?: number;
  /** Optional specialization slots; the frame contains no journal fields. */
  decoration?: ReactNode;
  iconDecoration?: ReactNode;
};

/** Shared color-and-glyph frame; names, doses and other content are composed. */
export function MedicationCardBase({
  color: value,
  icon,
  iconRotation = 0,
  decoration,
  iconDecoration,
  children,
  className,
  style,
  type = "button",
  ...props
}: MedicationCardBaseProps) {
  const color = getMedicationColor(value);
  const scale = getMedicationColorScale(color.value);
  const svg = getSvgIcon(icon ?? "pill");
  const pigment =
    svg?.variant === "color" ? (svg.color?.hex ?? scale.icon) : scale.icon;
  const hasContent = children !== null && children !== undefined;

  return (
    <button
      {...props}
      type={type}
      className={cn("medication-card-base intake-log-card", className)}
      style={
        {
          "--entry-color": color.hex,
          "--entry-rim-color": `${color.hex}1f`,
          "--entry-icon-tint": `${color.hex}66`,
          ...style,
        } as CSSProperties
      }
      aria-label={
        props["aria-label"] ?? (hasContent ? undefined : "Medication Icon")
      }
      data-medication-card-base
      data-card-empty={!hasContent || undefined}
      data-light-accent={
        getMedicationPreviewSurface(color.hex) === APP_COLORS.ink || undefined
      }
    >
      <span aria-hidden="true" className="intake-card-glass">
        <span className="intake-card-pattern" data-intake-pattern />
        <span className="intake-card-ink" data-intake-ink />
        <span className="intake-card-readability" data-intake-readability />
        <span className="intake-card-color-wash" data-intake-color-overlay />
        <span className="intake-card-tone" data-intake-tone />
      </span>
      {decoration}
      {/* Legacy aliases keep intake measurement and entrance hooks unchanged. */}
      <div className="medication-card-content intake-card-content">
        <span
          className="medication-card-focus intake-card-focus"
          aria-hidden="true"
        >
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
            {iconDecoration}
          </span>
        </span>
        {children}
      </div>
    </button>
  );
}
