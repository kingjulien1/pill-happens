"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PencilSparklesIcon } from "@/components/action-icon";
import type { AccentButtonProps } from "@/components/accent-button";
import { TodayActionButton } from "@/components/today-action-button";
import { INTAKE_ACTION_GEOMETRY } from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "./dialog-primary-button.module.css";

type DialogPrimaryButtonProps = Omit<AccentButtonProps, "radius" | "finish"> & {
  /** Optional short aside after the dialog action label and dot. */
  secondaryText?: ReactNode;
};

/** Dialog submissions share the satin host and intake-card geometry. */
export function DialogPrimaryButton({
  children,
  className,
  style,
  pending = false,
  leadingIcon,
  trailingIcon,
  secondaryText,
  "aria-busy": ariaBusy,
  ...props
}: DialogPrimaryButtonProps) {
  const busy = pending || ariaBusy === true || ariaBusy === "true";
  const geometry: CSSProperties = {
    height: INTAKE_ACTION_GEOMETRY.height,
    minHeight: INTAKE_ACTION_GEOMETRY.height,
    borderRadius: INTAKE_ACTION_GEOMETRY.radius,
  };
  const leading =
    leadingIcon === undefined ? (
      busy ? (
        <LoaderCircle
          className={styles.spinner}
          size={23}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      ) : (
        <PencilSparklesIcon size={23} strokeWidth={2.5} aria-hidden="true" />
      )
    ) : (
      leadingIcon
    );
  const trailing =
    trailingIcon === undefined ? (
      <ArrowRight size={23} strokeWidth={2.5} aria-hidden="true" />
    ) : (
      trailingIcon
    );

  return (
    <TodayActionButton
      {...props}
      pending={pending}
      aria-busy={ariaBusy}
      radius={INTAKE_ACTION_GEOMETRY.radius}
      className={
        typeof className === "function"
          ? (state) => cn(styles.button, className(state))
          : cn(styles.button, className)
      }
      style={
        typeof style === "function"
          ? (state) => ({ ...style(state), ...geometry })
          : { ...style, ...geometry }
      }
      data-dialog-primary-button
    >
      <span
        className={cn("intake-primary-row", styles.content)}
        data-no-trailing={trailing == null || undefined}
      >
        <span className="intake-primary-copy">
          <span className="intake-primary-label">
            {leading != null && (
              <span className="intake-log-symbol" aria-hidden="true">
                {leading}
              </span>
            )}
            <span className={styles.label}>{children}</span>
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
        {trailing != null && (
          <span className="intake-primary-next" aria-hidden="true">
            {trailing}
          </span>
        )}
      </span>
    </TodayActionButton>
  );
}
