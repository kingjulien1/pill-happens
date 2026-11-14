"use client";

import {
  LayeredActionButton,
  type PrimaryButtonProps,
} from "@/components/primary-button";

/** A supporting role keeps its compact geometry on the canonical renderer. */
export function SecondaryButton(props: PrimaryButtonProps) {
  return <LayeredActionButton {...props} kind="secondary" />;
}
