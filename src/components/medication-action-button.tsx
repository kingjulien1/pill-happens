"use client";

import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { PrimaryButton } from "@/components/primary-button";
import { INTAKE_ACTION_GEOMETRY } from "@/lib/action-button-system";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matching library and form actions, with a clear direction on either end. */
export function MedicationActionButton({
  intent,
  pending = false,
  className,
  disabled,
  style,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  intent: "add" | "save";
  pending?: boolean;
}) {
  if (intent === "add") {
    const geometry = {
      height: INTAKE_ACTION_GEOMETRY.height,
      minHeight: INTAKE_ACTION_GEOMETRY.height,
    };
    return (
      <PrimaryButton
        {...props}
        surface="accent"
        radius={INTAKE_ACTION_GEOMETRY.radius}
        disabled={disabled || pending}
        pending={pending}
        className={
          typeof className === "function"
            ? (state) =>
                cn("intake-primary-cta w-full max-w-full", className(state))
            : cn("intake-primary-cta w-full max-w-full", className)
        }
        style={
          typeof style === "function"
            ? (state) => ({ ...geometry, ...style(state) })
            : { ...geometry, ...style }
        }
        data-medication-add-action
      >
        <span className="intake-primary-row">
          <span className="intake-primary-copy">
            <span className="intake-primary-label">
              <span
                className="relative -left-[5px] inline-flex size-[25px] shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                {pending ? (
                  <LoaderCircle
                    className="size-[23px] motion-safe:animate-spin"
                    strokeWidth={2.5}
                    aria-hidden="true"
                    focusable="false"
                  />
                ) : (
                  <ActionIcon name="pencilSparkles" className="size-[23px]" />
                )}
              </span>
              {pending ? "Saving…" : "Add a Medication"}
            </span>
          </span>
          <ActionIcon name="next" className="intake-primary-next" />
        </span>
      </PrimaryButton>
    );
  }

  return (
    <DialogPrimaryButton
      {...props}
      disabled={disabled || pending}
      pending={pending}
      style={style}
      className={cn("w-full max-w-full rounded-2xl", className)}
    >
      {pending ? "Saving…" : "Save Medication"}
    </DialogPrimaryButton>
  );
}
