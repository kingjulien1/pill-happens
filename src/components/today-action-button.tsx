"use client";

import type { CSSProperties } from "react";
import {
  PrimaryButton,
  type PrimaryButtonProps,
} from "@/components/primary-button";
import { TODAY_CONTROL_PAINT } from "@/lib/today-control-paint";
import { cn } from "@/lib/utils";
import styles from "./today-controls.module.css";

/** Card-sized satin action. Native semantics and content stay with the caller. */
export function TodayActionButton({
  className,
  style,
  ...props
}: PrimaryButtonProps) {
  const paint = { ...TODAY_CONTROL_PAINT } as CSSProperties;
  return (
    <PrimaryButton
      {...props}
      rim={false}
      gpuRim={false}
      data-control-style="satin"
      className={
        typeof className === "function"
          ? (state) => cn(styles.action, className(state))
          : cn(styles.action, className)
      }
      style={
        typeof style === "function"
          ? (state) => ({ ...paint, ...style(state) })
          : { ...paint, ...style }
      }
    />
  );
}
