"use client";

import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";
import { doseMg, formatDose } from "@/lib/domain";
import { formatQuantityShortcut } from "@/lib/intake-quantity";
import { intakeAmountPage } from "@/lib/intake-amount-page";
import styles from "./intake-quantity-shortcuts.module.css";

/** Keep the quantity and its calculated dose on separate, predictable rows. */
export function IntakeQuantityShortcuts({
  amounts,
  value,
  strengthMg,
  unit,
  units = unit,
  increment,
  resetKey,
  disabled = false,
  onSelect,
}: {
  amounts: number[];
  value: number | null;
  strengthMg: number;
  unit: string;
  units?: string;
  increment: number;
  resetKey: string;
  disabled?: boolean;
  onSelect: (amount: number) => void;
}) {
  const pageKey = JSON.stringify([resetKey, amounts, increment]);
  const [position, setPosition] = useState({
    key: pageKey,
    start: 0,
    direction: "right",
  });
  const page = intakeAmountPage(
    amounts,
    increment,
    position.key === pageKey ? position.start : 0,
  );
  const move = (start: number | null, direction: "left" | "right") => {
    if (disabled || start === null) return;
    setPosition({ key: pageKey, start, direction });
  };
  return (
    <div className={styles.root} data-intake-quantity-shortcuts>
      <div className={styles.caption} aria-hidden="true">
        <span>Amounts</span>
        <span>
          {disabled
            ? "Choose medication first"
            : strengthMg > 0
              ? `1 ${unit} = ${formatDose(strengthMg)} mg`
              : `Amounts in ${units}`}
        </span>
      </div>
      <div className={styles.browser}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={styles.pageButton}
          data-dialog-corner="compact"
          aria-label="Show smaller amounts"
          title="Show smaller amounts"
          disabled={disabled || page.previousStart === null}
          onClick={() => move(page.previousStart, "left")}
        >
          <ChevronsLeft className="size-3.5" strokeWidth={2.25} />
        </Button>
        <div
          className={styles.options}
          role="group"
          aria-label="Intake amounts"
          data-direction={position.direction}
        >
          {page.amounts.map((amount) => {
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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={styles.pageButton}
          data-dialog-corner="compact"
          aria-label="Show larger amounts"
          title="Show larger amounts"
          disabled={disabled || page.nextStart === null}
          onClick={() => move(page.nextStart, "right")}
        >
          <ChevronsRight className="size-3.5" strokeWidth={2.25} />
        </Button>
        <span className="sr-only" role="status" aria-atomic="true">
          {!disabled && page.amounts.length > 0
            ? `Showing amounts from ${formatQuantityShortcut(page.amounts[0])} to ${formatQuantityShortcut(page.amounts[page.amounts.length - 1])} ${units}.`
            : "Choose a medication to browse amounts."}
        </span>
      </div>
    </div>
  );
}
