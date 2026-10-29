"use client";

import { ActionIcon } from "@/components/action-icon";
import { usePwa } from "@/components/pwa-provider";

export function InstallAppButton() {
  const { installed, install } = usePwa();
  if (installed) return null;
  return (
    <button
      type="button"
      onClick={() => void install()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      data-install-app
    >
      <ActionIcon name="export" className="size-4" />
      Install App
    </button>
  );
}
