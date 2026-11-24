"use client";

import { SaveOptions, type SaveOptionsProps } from "./save-options";
import type { ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { PrimaryButtonProps } from "@/components/primary-button";
import { TodayActionButton } from "@/components/today-action-button";
import { SpecularCardBorder } from "@/components/specular-card-border";
import {
  getIntakeActionThemeStyle,
  INTAKE_ACTION_GEOMETRY,
} from "@/lib/action-button-system";
import { cn } from "@/lib/utils";

type IntakePrimaryButtonProps = Omit<
  PrimaryButtonProps,
  "decoration" | "radius" | "surface"
> & {
  saveOptions?: SaveOptionsProps;
  symbol: ReactNode;
  secondaryText?: ReactNode;
};

/** The main Log Intake face, content rail and outboard frame, shared unchanged. */
export function IntakePrimaryButton({
  children,
  saveOptions,
  symbol,
  secondaryText,
  className,
  style,
  pending = false,
  ...props
}: IntakePrimaryButtonProps) {
  const paint = {
    ...getIntakeActionThemeStyle(),
    height: INTAKE_ACTION_GEOMETRY.height,
    minHeight: INTAKE_ACTION_GEOMETRY.height,
  };
  return (
    <div className="intake-action-shell">
      <SpecularCardBorder desktop />
      <TodayActionButton
        {...props}
        pending={pending}
        surface="solid"
        radius={INTAKE_ACTION_GEOMETRY.radius}
        style={
          typeof style === "function"
            ? (state) => ({ ...paint, ...style(state) })
            : { ...paint, ...style }
        }
        data-intake-paint="satin"
        data-log-intake-rim
        decoration={<SpecularCardBorder />}
        className={
          typeof className === "function"
            ? (state) =>
                cn(
                  "intake-primary-cta pointer-events-auto w-full",
                  className(state),
                )
            : cn("intake-primary-cta pointer-events-auto w-full", className)
        }
      >
        <span className="intake-primary-row">
          <span className="intake-primary-copy">
            <span className="intake-primary-label">
              {pending ? (
                <span className="intake-log-symbol" aria-hidden="true">
                  <LoaderCircle
                    className="intake-log-symbol-pill motion-safe:animate-spin"
                    size={23}
                    strokeWidth={3.25}
                  />
                </span>
              ) : (
                symbol
              )}
              {children}
            </span>
            {secondaryText != null && (
              <>
                <span className="intake-primary-dot" aria-hidden="true">
                  ·
                </span>
                <span className="intake-primary-aside">{secondaryText}</span>
              </>
            )}
          </span>
          <ArrowRight
            className="intake-primary-next"
            size={23}
            strokeWidth={3.25}
            aria-hidden="true"
          />
        </span>
      </TodayActionButton>
      {saveOptions && <SaveOptions {...saveOptions} />}
    </div>
  );
}
