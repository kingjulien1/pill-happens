"use client";

import type { ComponentProps, CSSProperties } from "react";
import { AccentButtonSurface } from "@/components/accent-button";
import { ActionButtonTint } from "@/components/action-button-tint";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Button, buttonVariants } from "@/components/ui/button";
import { SpecularRim } from "@/components/specular-rim";
import {
  getButtonThemeStyle,
  type ActionButtonTheme,
} from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "./action-button.module.css";

export type PrimaryButtonProps = ComponentProps<typeof Button> & {
  radius?: number;
  pending?: boolean;
  theme?: ActionButtonTheme;
  /** Static documentation/state examples avoid mounting a graphics context. */
  motion?: boolean;
  /** Solid keeps the native button and content without decorative paint or graphics. */
  surface?: "layered" | "accent" | "solid";
};

export function LayeredActionButton({
  children,
  className,
  style,
  variant = "default",
  size = "default",
  radius,
  pending = false,
  disabled = false,
  theme,
  motion = true,
  surface = "layered",
  kind = "primary",
  "aria-busy": ariaBusy,
  ...props
}: PrimaryButtonProps & { kind?: "primary" | "secondary" }) {
  const busy = pending || ariaBusy === true || ariaBusy === "true";
  const corner = radius ?? (kind === "primary" ? 22 : 16);
  const classes = buttonVariants({ variant, size });
  const baseStyle = {
    ...getButtonThemeStyle(kind, theme, surface === "accent" ? "accent" : kind),
    borderRadius: corner,
    ...(surface === "accent" ? { "--accent-radius": `${corner}px` } : {}),
  } as CSSProperties;
  return (
    <ButtonPrimitive
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || ariaBusy}
      data-slot="button"
      data-button-kind={kind}
      data-button-face={surface}
      data-button-theme={theme}
      data-button-motion={motion ? "on" : "off"}
      data-button-state={busy ? "pending" : disabled ? "disabled" : "ready"}
      className={
        typeof className === "function"
          ? (state) =>
              cn(
                classes,
                styles.button,
                kind === "primary" && "intake-log-action",
                className(state),
              )
          : cn(
              classes,
              styles.button,
              kind === "primary" && "intake-log-action",
              className,
            )
      }
      style={
        typeof style === "function"
          ? (state) => ({ ...baseStyle, ...style(state) })
          : { ...baseStyle, ...style }
      }
    >
      {surface === "accent" ? (
        <AccentButtonSurface
          tint
          className={styles.accentSurface}
          data-button-surface
        />
      ) : surface === "layered" ? (
        <span
          className={cn(styles.surface, "intake-button-surface")}
          aria-hidden="true"
          data-button-surface
        >
          <span
            className={cn(styles.field, "intake-button-gradient")}
            data-button-layer="field"
          />
          <span
            className={cn(styles.diagonal, "intake-button-diagonal")}
            data-button-layer="diagonal"
          />
          <span
            className={cn(styles.wash, "intake-button-wash")}
            data-button-layer="wash"
          />
          <ActionButtonTint />
        </span>
      ) : null}
      {surface !== "solid" && (
        <>
          {motion && (
            <SpecularRim
              key={theme ?? "system"}
              radius={corner}
              palette="triad"
              glow={false}
            />
          )}
          <span
            className={cn(styles.fallback, "intake-specular-fallback")}
            aria-hidden="true"
            data-button-rim
          />
        </>
      )}
      <span className={styles.content} data-button-content>
        {children}
      </span>
    </ButtonPrimitive>
  );
}

export function PrimaryButton(props: PrimaryButtonProps) {
  return <LayeredActionButton {...props} />;
}
