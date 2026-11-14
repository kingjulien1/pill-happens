"use client";

import type { ComponentProps, CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  getButtonThemeStyle,
  type ActionButtonTheme,
} from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "./action-button.module.css";

export type PrimaryButtonProps = Omit<ComponentProps<typeof Button>, "kind"> & {
  radius?: number;
  pending?: boolean;
  theme?: ActionButtonTheme;
  /** Static documentation/state examples keep the shared rim still. */
  motion?: boolean;
  /** Legacy finish names remain accepted; the renderer uses one solid face. */
  surface?: "layered" | "accent" | "solid";
  rim?: boolean;
  /** Shared GPU/CSS edge width; its paint stays within the button. */
  rimThickness?: number;
  /** Only prominent actions opt into the GPU version of the shared rim. */
  gpuRim?: boolean;
};

/** Compatibility geometry and content; Button owns the host and shared paint. */
export function LayeredActionButton({
  children,
  className,
  style,
  radius,
  theme,
  surface = "layered",
  rimThickness = 3,
  kind = "primary",
  ...props
}: PrimaryButtonProps & { kind?: "primary" | "secondary" }) {
  const rimWidth = Number.isFinite(rimThickness)
    ? Math.max(0.5, rimThickness)
    : 3;
  const corner = radius ?? (kind === "primary" ? 22 : 16);
  const baseStyle = {
    ...getButtonThemeStyle(kind, theme, surface === "accent" ? "accent" : kind),
    borderRadius: corner,
    "--action-rim-thickness": `${rimWidth}px`,
    ...(surface === "accent" ? { "--accent-radius": `${corner}px` } : {}),
  } as CSSProperties;

  return (
    <Button
      {...props}
      kind={kind}
      radius={corner}
      theme={theme}
      surface={surface}
      rimThickness={rimWidth}
      className={
        typeof className === "function"
          ? (state) =>
              cn(
                styles.button,
                kind === "primary" && "intake-log-action",
                className(state),
              )
          : cn(
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
      <span className={styles.content} data-button-content>
        {children}
      </span>
    </Button>
  );
}

export function PrimaryButton(props: PrimaryButtonProps) {
  return <LayeredActionButton {...props} />;
}
