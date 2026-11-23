import { ActionIcon } from "@/components/action-icon";
import { MedicationTypeIcon } from "@/components/medication-icon";
import { cn } from "@/lib/utils";

/** Reuse the journal signature or a plain tablet/pill outline. */
export function IntakeLogSymbol({
  className,
  variant = "signature",
  medicationType = "tablet",
}: {
  className?: string;
  variant?: "signature" | "pills";
  medicationType?: "tablet" | "capsule";
}) {
  return (
    <span
      className={cn("intake-log-symbol", className)}
      data-intake-log-symbol={variant}
      aria-hidden="true"
    >
      {variant === "pills" ? (
        <MedicationTypeIcon
          type={medicationType}
          className="intake-log-symbol-pill size-[23px]"
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
