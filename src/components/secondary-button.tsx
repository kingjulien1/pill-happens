"use client";

import {
  LayeredActionButton,
  type PrimaryButtonProps,
} from "@/components/primary-button";

export function SecondaryButton(props: PrimaryButtonProps) {
  return <LayeredActionButton {...props} kind="secondary" />;
}
