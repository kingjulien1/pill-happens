"use client";

import { lazy, Suspense, type LazyExoticComponent } from "react";
import { CircleDashed, type LucideIcon } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideMedicationIconName } from "@/lib/lucide-icon-names";

/**
 * This module is itself lazy: ordinary journal views keep the synchronous legacy
 * glyphs, and each additional drawing is fetched only when it is displayed.
 * React.lazy caches each loaded drawing across result lists and saved markers.
 */
const glyphs = Object.fromEntries(
  Object.entries(dynamicIconImports).map(([name, load]) => [name, lazy(load)]),
) as Record<LucideMedicationIconName, LazyExoticComponent<LucideIcon>>;

export default function DynamicMedicationGlyph({
  name,
}: {
  name: LucideMedicationIconName;
}) {
  const Glyph = glyphs[name];
  return (
    <Suspense
      fallback={
        <CircleDashed
          aria-hidden="true"
          focusable="false"
          strokeWidth={2.75}
          className="size-full opacity-40"
          data-glyph-loading
        />
      }
    >
      <Glyph
        aria-hidden="true"
        focusable="false"
        strokeWidth={2.75}
        className="size-full"
      />
    </Suspense>
  );
}
