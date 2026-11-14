"use client";

import type { CSSProperties } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { SpecularRim } from "@/components/specular-rim";
import type { ActionButtonTheme } from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "../shared-button.module.css";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-center text-sm font-medium whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        secondary: "",
        ghost: "",
        destructive: "",
        link: "underline-offset-4",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 p-0",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] p-0 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] p-0 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    radius?: number;
    pending?: boolean;
    theme?: ActionButtonTheme;
    motion?: boolean;
    rim?: boolean;
    rimThickness?: number;
    /** Keep GPU contexts reserved for prominent native-button actions. */
    gpuRim?: boolean;
    /** Preserve anchor role and native Space scrolling for navigation actions. */
    navigation?: boolean;
    kind?: "primary" | "secondary" | "accent";
    /** Compatibility input: all actions now use the shared solid finish. */
    surface?: "layered" | "accent" | "solid";
  };

/** Compatibility paint helper; Button itself owns this exact same rim. */
function FilledActionSurface() {
  return <span className={styles.rim} data-button-rim aria-hidden="true" />;
}

/** One native Base UI host and one paint system for every journal action. */
function Button({
  className,
  style,
  children,
  variant = "default",
  size = "default",
  radius,
  pending = false,
  theme,
  motion = true,
  rim,
  rimThickness,
  gpuRim = false,
  navigation = false,
  kind,
  surface: requestedSurface,
  disabled = false,
  "aria-busy": ariaBusy,
  ...props
}: ButtonProps) {
  const quiet = variant === "ghost";
  const textOnly = variant === "link";
  const showRim = rim ?? (!quiet && !textOnly);
  const width =
    rimThickness === undefined
      ? undefined
      : Number.isFinite(rimThickness)
        ? Math.max(0.5, rimThickness)
        : 3;
  const busy = pending || ariaBusy === true || ariaBusy === "true";
  const ariaDisabled =
    props["aria-disabled"] === true || props["aria-disabled"] === "true";
  const inactive = disabled || pending || ariaDisabled;
  const paintStyle = {
    ...(radius !== undefined && Number.isFinite(radius)
      ? { borderRadius: Math.max(0, radius) }
      : {}),
    ...(width !== undefined ? { "--action-rim-thickness": `${width}px` } : {}),
  } as CSSProperties;
  const classes = buttonVariants({ variant, size });

  return (
    <ButtonPrimitive
      {...props}
      nativeButton={navigation ? false : props.nativeButton}
      role={navigation ? "link" : props.role}
      onKeyDown={
        navigation
          ? (event) => {
              props.onKeyDown?.(event);
              if (event.key === " ") event.preventBaseUIHandler();
            }
          : props.onKeyDown
      }
      onKeyUp={
        navigation
          ? (event) => {
              props.onKeyUp?.(event);
              if (event.key === " ") event.preventBaseUIHandler();
            }
          : props.onKeyUp
      }
      disabled={inactive}
      focusableWhenDisabled={
        props.focusableWhenDisabled ?? (ariaDisabled && !disabled && !pending)
      }
      aria-busy={pending || ariaBusy}
      data-slot="button"
      data-button-system="daily"
      data-button-variant={variant}
      data-button-paint={textOnly ? "text" : quiet ? "quiet" : "filled"}
      data-filled-action={!textOnly || undefined}
      data-button-face="solid"
      data-button-kind={
        kind ?? (variant === "secondary" ? "secondary" : "primary")
      }
      data-button-theme={theme}
      data-button-motion={motion ? "on" : "off"}
      data-button-state={busy ? "pending" : inactive ? "disabled" : "ready"}
      data-requested-surface={requestedSurface}
      className={
        typeof className === "function"
          ? (state) => cn(classes, styles.button, className(state))
          : cn(classes, styles.button, className)
      }
      style={
        typeof style === "function"
          ? (state) => ({ ...paintStyle, ...style(state) })
          : { ...paintStyle, ...style }
      }
    >
      {showRim && (
        <>
          {gpuRim && motion && props.nativeButton !== false && (
            <SpecularRim
              radius={radius ?? 22}
              thickness={width ?? 3}
              palette="triad"
              glow={false}
            />
          )}
          <FilledActionSurface />
        </>
      )}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants, FilledActionSurface };
