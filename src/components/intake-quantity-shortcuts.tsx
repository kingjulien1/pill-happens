import { doseMg, formatDose } from "@/lib/domain";
import { formatQuantityShortcut } from "@/lib/intake-quantity";
import styles from "./intake-quantity-shortcuts.module.css";

/** Keep the quantity and its calculated dose on separate, predictable rows. */
export function IntakeQuantityShortcuts({
  amounts,
  value,
  strengthMg,
  unit,
  units = unit,
  disabled = false,
  onSelect,
}: {
  amounts: number[];
  value: number | null;
  strengthMg: number;
  unit: string;
  units?: string;
  disabled?: boolean;
  onSelect: (amount: number) => void;
}) {
  return (
    <div className={styles.root} data-intake-quantity-shortcuts>
      <div className={styles.caption} aria-hidden="true">
        <span>Quick amounts</span>
        <span>{disabled ? "Choose medication first" : "Tap to set"}</span>
      </div>
      <div
        className={styles.options}
        role="group"
        aria-label="Quick intake amounts"
      >
        {amounts.map((amount) => {
          const label = formatQuantityShortcut(amount);
          const dose =
            strengthMg > 0
              ? formatDose(doseMg({ strengthMg, quantity: amount }))
              : null;
          const description = `${label} ${amount === 1 ? unit : units}${dose ? ` · ${dose} mg` : ""}`;
          return (
            <button
              key={amount}
              type="button"
              className={styles.option}
              aria-label={`Set amount to ${description}`}
              title={description}
              disabled={disabled}
              aria-pressed={!disabled && value === amount}
              onClick={() => onSelect(amount)}
            >
              <span
                className={styles.quantity}
                data-long={label.length > 5 || undefined}
              >
                {label}
              </span>
              {dose !== null && (
                <span className={styles.dose}>
                  {dose}
                  <span>mg</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
