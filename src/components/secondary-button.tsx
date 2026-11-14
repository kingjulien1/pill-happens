"use client";

import type { CSSProperties } from "react";
import type { PrimaryButtonProps } from "@/components/primary-button";
import { Button } from "@/components/ui/button";
import { getButtonThemeStyle } from "@/lib/action-button-system";
import { APP_THEME_VALUES } from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import styles from "./secondary-button.module.css";

/** Supporting actions retain tonal paint and responsive geometry without a rim. */
export function SecondaryButton({
  children,
  className,
  style,
  radius = 16,
  theme,
  variant = "secondary",
  ...props
}: PrimaryButtonProps) {
  const corner = Number.isFinite(radius) ? Math.max(0, radius) : 16;
  const baseStyle = {
    ...getButtonThemeStyle("secondary", theme),
    ...(theme
      ? {
          "--secondary": APP_THEME_VALUES[theme].secondary,
          "--secondary-foreground":
            APP_THEME_VALUES[theme]["secondary-foreground"],
        }
      : {}),
    borderRadius: corner,
    boxShadow: "none",
  } as CSSProperties;

  return (
    <Button
      {...props}
      appearance="standard"
      variant={variant}
      kind="secondary"
      radius={corner}
      theme={theme}
      rim={false}
      gpuRim={false}
      className={
        typeof className === "function"
          ? (state) => cn(styles.button, className(state))
          : cn(styles.button, className)
      }
      style={
        typeof style === "function"
          ? (state) => ({ ...baseStyle, ...style(state) })
          : { ...baseStyle, ...style }
      }
    >
      <span className={styles.content} data-button-content>
        {children}
      </span>
    </Button>
  );
}
