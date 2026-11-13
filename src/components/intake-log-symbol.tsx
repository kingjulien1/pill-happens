import { Tablets } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { cn } from "@/lib/utils";

/** Reuse the journal mark frame with an optional plain-tablets action glyph. */
export function IntakeLogSymbol({
  className,
  variant = "signature",
}: {
  className?: string;
  variant?: "signature" | "pills";
}) {
  return (
    <span
      className={cn("intake-log-symbol", className)}
      data-intake-log-symbol={variant}
      aria-hidden="true"
    >
      {variant === "pills" ? (
        <Tablets
          className="intake-log-symbol-pill size-[23px]"
          size={23}
          strokeWidth={2.5}
          aria-hidden="true"
          focusable="false"
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
