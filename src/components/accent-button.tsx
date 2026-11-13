"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PencilSparklesIcon } from "@/components/action-icon";
import { ActionButtonTint } from "@/components/action-button-tint";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getAccentFinishStyle,
  getAccentRadiusStyle,
  getButtonThemeStyle,
  type AccentButtonFinish,
  type ActionButtonTheme,
} from "@/lib/action-button-system";
import actionStyles from "./action-button.module.css";
import styles from "./accent-button.module.css";

export type AccentButtonProps = ComponentProps<typeof Button> & {
  radius?: number;
  pending?: boolean;
  theme?: ActionButtonTheme;
  motion?: boolean;
  finish?: AccentButtonFinish;
  /** Pass null to suppress a glyph; undefined retains the shared default. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

/** Shared paint only; each button owns its frame, content, rim and interaction. */
export function AccentButtonSurface({
  finish = "field",
  tint = false,
  className,
  ...props
}: ComponentProps<"span"> & { finish?: AccentButtonFinish; tint?: boolean }) {
  return (
    <span
      {...props}
      className={cn(styles.surface, className)}
      aria-hidden="true"
      data-accent-surface
    >
      <span
        className={styles.field}
        aria-hidden="true"
        data-accent-field
        data-accent-gradient
      />
      {finish === "glazed" && (
        <>
          <span
            className={styles.anchor}
            aria-hidden="true"
            data-accent-anchor
          />
          <span className={styles.wash} aria-hidden="true" data-accent-wash />
        </>
      )}
      {tint && <ActionButtonTint />}
      <span className={styles.sheen} aria-hidden="true" />
    </span>
  );
}

/** A warm, fully painted CSS accent; interaction stays with the shared primitive. */
export function AccentButton({
  children,
  className,
  style,
  variant = "default",
  size = "default",
  radius,
  pending = false,
  theme,
  motion = true,
  finish = "field",
  leadingIcon,
  trailingIcon,
  disabled = false,
  "aria-busy": ariaBusy,
  ...props
}: AccentButtonProps) {
  const busy = pending || ariaBusy === true || ariaBusy === "true";
  const inactive =
    disabled ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  const leading =
    leadingIcon === undefined ? (
      busy ? (
        <LoaderCircle
          className={styles.spinner}
          size={22}
          strokeWidth={2.5}
          aria-hidden="true"
          focusable="false"
          data-accent-spinner
        />
      ) : (
        <PencilSparklesIcon
          size={22}
          strokeWidth={2.5}
          aria-hidden="true"
          focusable="false"
        />
      )
    ) : (
      leadingIcon
    );
  const trailing =
    trailingIcon === undefined ? (
      <ArrowRight
        size={22}
        strokeWidth={2.5}
        aria-hidden="true"
        focusable="false"
      />
    ) : (
      trailingIcon
    );
  const classes = buttonVariants({ variant, size });
  const baseStyle = {
    ...getButtonThemeStyle("accent", theme),
    ...getAccentFinishStyle(finish),
    ...getAccentRadiusStyle(radius),
  } as CSSProperties;

  return (
    <ButtonPrimitive
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || ariaBusy}
      data-slot="button"
      data-accent-button
      data-accent-finish={finish}
      data-button-kind="accent"
      data-button-theme={theme}
      data-button-motion={motion ? "on" : "off"}
      data-accent-state={busy ? "pending" : inactive ? "disabled" : "ready"}
      className={
        typeof className === "function"
          ? (state) =>
              cn(
                classes,
                "rimmed-action-button",
                actionStyles.button,
                styles.button,
                className(state),
              )
          : cn(
              classes,
              "rimmed-action-button",
              actionStyles.button,
              styles.button,
              className,
            )
      }
      style={
        typeof style === "function"
          ? (state) => ({
              ...baseStyle,
              ...style(state),
            })
          : {
              ...baseStyle,
              ...style,
            }
      }
    >
      <span className={styles.aura} aria-hidden="true" data-accent-aura />
      <span className={styles.rim} aria-hidden="true" data-accent-rim>
        <span
          className={styles.rimFlow}
          aria-hidden="true"
          data-accent-rim-flow
        />
      </span>
      <AccentButtonSurface finish={finish} tint />
      <span className={styles.content} data-accent-content>
        <span className={styles.copy} data-accent-copy>
          {leading != null && (
            <span
              className={styles.icon}
              data-accent-icon="leading"
              aria-hidden="true"
            >
              {leading}
            </span>
          )}
          <span className={styles.label} data-accent-label>
            {children}
          </span>
        </span>
        {trailing != null && (
          <span
            className={styles.icon}
            data-accent-icon="trailing"
            aria-hidden="true"
          >
            {trailing}
          </span>
        )}
      </span>
    </ButtonPrimitive>
  );
}
