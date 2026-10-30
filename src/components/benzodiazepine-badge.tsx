import { CrosshairSimpleIcon } from "@phosphor-icons/react/dist/ssr/CrosshairSimple";
import { cn } from "@/lib/utils";

export function BenzodiazepineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("benzodiazepine-badge", className)}
      role="img"
      aria-label="Benzodiazepine"
      title="Benzodiazepine"
    >
      <CrosshairSimpleIcon weight="bold" aria-hidden="true" focusable="false" />
      <span aria-hidden="true">Benzo</span>
    </span>
  );
}
