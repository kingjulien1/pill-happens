"use client";

import type { CSSProperties } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { SpecularRim } from "@/components/specular-rim";
import type { ActionButtonTheme } from "@/lib/action-button-system";
import { cn } from "@/lib/utils";
import styles from "../shared-button.module.css";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-clip-padding text-center text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-action-background text-action-foreground md:hover:bg-action-background/90",
        outline:
          "border-border bg-background md:hover:bg-muted md:hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:md:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground md:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "md:hover:bg-muted md:hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:md:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive md:hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:md:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-foreground underline-offset-4 md:hover:underline",
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
    /** Reserve the intake face, moving rim and glow for deliberate main actions. */
    appearance?: "standard" | "intake";
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
    /** Main-action compatibility input; its intake finish remains solid. */
    surface?: "layered" | "accent" | "solid";
  };

/** Compatibility paint helper; Button itself owns this exact same rim. */
function FilledActionSurface() {
  return <span className={styles.rim} data-button-rim aria-hidden="true" />;
}

/** One native host; ordinary variants and the explicit main-action finish. */
function Button({
  className,
  style,
  children,
  variant = "default",
  size = "default",
  appearance = "standard",
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
  const intake = appearance === "intake";
  const showRim = intake && (rim ?? (!quiet && !textOnly));
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
      data-button-system={intake ? "daily" : "standard"}
      data-button-variant={variant}
      data-button-paint={textOnly ? "text" : quiet ? "quiet" : "filled"}
      data-filled-action={(intake && !textOnly) || undefined}
      data-button-face={intake ? "solid" : undefined}
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
          {gpuRim && motion && !navigation && props.nativeButton !== false && (
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
