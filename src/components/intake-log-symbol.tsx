import { ActionIcon } from "@/components/action-icon";
import { createLucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Lucide LayersArrowUp (ISC), from https://github.com/lucide-icons/lucide/blob/main/icons/layers-arrow-up.svg
const LayersArrowUp = createLucideIcon("LayersArrowUp", [
  ["path", { d: "M12 12V2", key: "shaft" }],
  [
    "path",
    {
      d: "M2 17.002a1 1 0 00.58.91l8.6 3.91a2 2 0 001.65 0l8.58-3.9a1 1 0 00.59-.92",
      key: "base",
    },
  ],
  [
    "path",
    {
      d: "M7.674 8.774 2.58 11.09a1 1 0 000 1.822l8.6 3.91a2 2 0 001.65 0l8.58-3.9a1 1 0 00.59-.92 1 1 0 00-.59-.922l-5.078-2.308",
      key: "layer",
    },
  ],
  ["path", { d: "m9 5 3-3 3 3", key: "arrow" }],
]);

export function IntakeLogSymbol({
  className,
  variant = "signature",
}: {
  className?: string;
  variant?: "signature" | "layers-arrow-up";
}) {
  return (
    <span
      className={cn("intake-log-symbol", className)}
      data-intake-log-symbol={variant}
      aria-hidden="true"
    >
      {variant === "layers-arrow-up" ? (
        <LayersArrowUp
          className="intake-log-symbol-pill"
          size={23}
          strokeWidth={3.25}
        />
      ) : (
        <>
          <ActionIcon
            name="medications"
            weight="bold"
            className="intake-log-symbol-pill"
          />
          <ActionIcon
            name="sparkle"
            weight="fill"
            className="intake-log-symbol-spark"
          />
        </>
      )}
    </span>
  );
}
