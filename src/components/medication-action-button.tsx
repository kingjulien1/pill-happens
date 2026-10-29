"use client";

import type { ComponentProps } from "react";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matching library and form actions, with a clear direction on either end. */
export function MedicationActionButton({
  intent,
  pending = false,
  className,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  intent: "add" | "save";
  pending?: boolean;
}) {
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        "h-13 w-full max-w-full gap-3 rounded-2xl px-4 text-sm font-medium",
        className,
      )}
    >
      <ActionIcon
        name={
          pending ? "loading" : intent === "add" ? "medications" : "confetti"
        }
        className={cn("size-5", pending && "animate-spin")}
      />
      <span>
        {pending
          ? "Saving…"
          : intent === "add"
            ? "Add a Medication"
            : "Save Medication"}
      </span>
      <ActionIcon
        name={intent === "add" ? "external" : "next"}
        className="size-[18px]"
      />
    </Button>
  );
}
