import { doseMg, formatDose } from "@/lib/domain";
import {
  getMedicationType,
  isMeteredMedicationType,
  type MedicationType,
} from "@/lib/medication-types";

/** Identical dose composition; only the source (recorded/default) is different. */
export function MedicationCardDose({
  quantity,
  strengthMg,
  form,
  source = "recorded",
}: {
  quantity: number;
  strengthMg: number;
  form?: MedicationType;
  source?: "recorded" | "default";
}) {
  const units = getMedicationType(form);
  const metered = isMeteredMedicationType(form);
  const total = formatDose(doseMg({ quantity, strengthMg }));
  const calculation = `${formatDose(quantity)}${metered ? ` ${quantity === 1 ? units.unit : units.units}` : ""} × ${formatDose(strengthMg)} mg`;
  const isDefault = source === "default";
  return (
    <div className="intake-card-dose-group" data-dose-source={source}>
      <span
        className="intake-card-amount"
        data-intake-dose={!isDefault || undefined}
        data-medication-strength={isDefault || undefined}
        title={`${isDefault ? "Default: " : ""}${calculation}`}
      >
        {formatDose(quantity)}
        {metered ? ` ${quantity === 1 ? units.unit : units.units}` : ""} ×{" "}
        <span data-medication-strength-value={isDefault || undefined}>
          {formatDose(strengthMg)}
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
          {total}
        </span>
        <span className="intake-card-total-unit">mg</span>
      </span>
    </div>
  );
}
