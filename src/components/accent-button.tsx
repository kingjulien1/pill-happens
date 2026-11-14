"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PencilSparklesIcon } from "@/components/action-icon";
import { ActionButtonTint } from "@/components/action-button-tint";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
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

/** Accent content and geometry delegate to the same shared action renderer. */
export function AccentButton({
  children,
  className,
  style,
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
  const baseStyle = {
    ...getButtonThemeStyle("accent", theme),
    ...getAccentRadiusStyle(radius),
  } as CSSProperties;

  return (
    <Button
      {...props}
      appearance="intake"
      disabled={disabled}
      pending={pending}
      aria-busy={ariaBusy}
      kind="accent"
      radius={radius}
      theme={theme}
      motion={motion}
      data-accent-button
      data-accent-finish={finish}
      data-accent-state={busy ? "pending" : inactive ? "disabled" : "ready"}
      className={
        typeof className === "function"
          ? (state) => cn(actionStyles.button, styles.button, className(state))
          : cn(actionStyles.button, styles.button, className)
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
      <span className={styles.content} data-accent-content>
        <span className={styles.copy} data-accent-copy>
          {leading != null && (
            <span
              className={styles.icon}
              data-accent-icon="leading"
              data-button-secondary
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
            data-button-secondary
            aria-hidden="true"
          >
            {trailing}
          </span>
        )}
      </span>
    </Button>
  );
}
