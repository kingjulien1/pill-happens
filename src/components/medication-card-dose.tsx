import { doseMg, formatDose } from "@/lib/domain";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  getMedicationType,
  isMeteredMedicationType,
  type MedicationType,
} from "@/lib/medication-types";

const plainValue = (
  _field: "quantity" | "strength" | "total",
  content: ReactNode,
) => content;

/** Identical dose composition; only the source (recorded/default) is different. */
export function MedicationCardDose({
  quantity,
  strengthMg,
  form,
  source = "recorded",
  renderValue = plainValue,
  decoration,
}: {
  quantity: number;
  strengthMg: number;
  form?: MedicationType;
  source?: "recorded" | "default";
  renderValue?: typeof plainValue;
  /** One zero-layout-cost mark for the complete recorded dose calculation. */
  decoration?: HTMLAttributes<HTMLDivElement>;
}) {
  const units = getMedicationType(form);
  const metered = isMeteredMedicationType(form);
  const total = formatDose(doseMg({ quantity, strengthMg }));
  const calculation = `${formatDose(quantity)}${metered ? ` ${quantity === 1 ? units.unit : units.units}` : ""} × ${formatDose(strengthMg)} mg`;
  const isDefault = source === "default";
  return (
    <div
      {...decoration}
      className={cn("intake-card-dose-group", decoration?.className)}
      data-dose-source={source}
    >
      <span
        className="intake-card-amount"
        data-intake-dose={!isDefault || undefined}
        data-medication-strength={isDefault || undefined}
        title={`${isDefault ? "Default: " : ""}${calculation}`}
      >
        {renderValue(
          "quantity",
          `${formatDose(quantity)}${metered ? ` ${quantity === 1 ? units.unit : units.units}` : ""}`,
        )}{" "}
        ×{" "}
        <span data-medication-strength-value={isDefault || undefined}>
          {renderValue("strength", formatDose(strengthMg))}
        </span>
        <span className="intake-card-mg">{"\u2009"}mg</span>
      </span>
      <span
        className="intake-card-total"
        data-intake-total={!isDefault || undefined}
        data-medication-default-dose={isDefault || undefined}
        data-total-long={total.length > 15 || undefined}
        title={`${isDefault ? "Default intake: " : ""}${total} mg`}
      >
        <span
          className="intake-card-total-value"
          data-intake-total-value={!isDefault || undefined}
          data-medication-default-dose-value={isDefault || undefined}
        >
          {renderValue("total", total)}
        </span>
        <span className="intake-card-total-unit">mg</span>
      </span>
    </div>
  );
}
