"use client";

import type { ComponentProps, CSSProperties } from "react";
import { AccentButton } from "@/components/accent-button";
import {
  ACCENT_RADIUS_RATIO,
  getAccentRadiusStyle,
} from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "./dialog-primary-button.module.css";

/** Existing dialog actions share the reusable accent without changing their API. */
export function DialogPrimaryButton({
  className,
  style,
  radius,
  ...props
}: ComponentProps<typeof AccentButton>) {
  const corner = `calc(var(--dialog-action-height) * ${ACCENT_RADIUS_RATIO})`;
  const geometry: CSSProperties =
    typeof radius === "number" && Number.isFinite(radius)
      ? getAccentRadiusStyle(radius)
      : ({ borderRadius: corner, "--accent-radius": corner } as CSSProperties);

  return (
    <AccentButton
      {...props}
      radius={radius}
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
    />
  );
}
