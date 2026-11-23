"use client";

import { useRef, useState, type CSSProperties } from "react";
import { MedicationIndicatorMark } from "./medication-indicator-mark";
import { MedicationGlyph, MedicationTypeIcon } from "./medication-icon";
import { getMedicationOutlineIcon } from "@/lib/medication-appearance";
import { IntakeRouteIcon } from "./intake-route-icon";
import type { MedicationCategory } from "@/lib/medication-categories";
import type { MedicationType } from "@/lib/medication-types";
import type { IntakeRoute } from "@/lib/intake-routes";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDose } from "@/lib/domain";
import { getMedicationType } from "@/lib/medication-types";
import {
  MAX_INTAKE_QUANTITY,
  MIN_EDITABLE_INTAKE_QUANTITY,
  limitIntakeQuantityInput,
  parseIntakeQuantity,
} from "@/lib/intake-quantity";
import styles from "./intake-amount-field.module.css";

const doseFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** One quantity editor; its dose is calculated, never interpreted as the quantity. */
export function IntakeAmountField({
  value,
  onChange,
  onStep,
  increment,
  unit,
  route,
  form,
  medicationIcon,
  medicationIconRotation = 0,
  categories,
  strengthMg,
  calculatedDose,
  originalQuantityPreserved = false,
  disabled = false,
  empty = false,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
  increment: number;
  unit: string;
  route?: IntakeRoute;
  form: MedicationType;
  medicationIcon?: string;
  medicationIconRotation?: number;
  categories: MedicationCategory[];
  strengthMg: number;
  calculatedDose: number | null;
  originalQuantityPreserved?: boolean;
  disabled?: boolean;
  empty?: boolean;
  invalid?: boolean;
}) {
  const [composition, setComposition] = useState<string | null>(null);
  const composing = useRef(false);
  const parsed = parseIntakeQuantity(value);
  const shown = composition ?? value;
  const outlineIcon = getMedicationOutlineIcon(medicationIcon);
  const commit = (raw: string) => {
    const limited = limitIntakeQuantityInput(raw);
    if (limited !== null) onChange(limited);
  };
  const dose =
    calculatedDose !== null && Number.isFinite(calculatedDose)
      ? calculatedDose > 0 && calculatedDose < 0.01
        ? "<0.01"
        : doseFormat.format(calculatedDose)
      : "—";
  const doseRounded =
    calculatedDose !== null &&
    Number.isFinite(calculatedDose) &&
    calculatedDose >= 0.01 &&
    Number(dose) !== calculatedDose;
  const legacyDescription =
    "Quantity is shown rounded. The original saved amount is kept until you edit the quantity or change the medication.";

  return (
    <div
      className={styles.field}
      data-intake-amount-field
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={styles.stepButton}
        data-dialog-corner="compact"
        data-intake-amount-step="decrease"
        aria-label="Decrease amount"
        aria-describedby="intake-amount-step-hint"
        disabled={
          disabled ||
          composition !== null ||
          parsed === null ||
          parsed <= increment
        }
        onClick={() => onStep(-increment)}
      >
        <ActionIcon name="subtract" weight="bold" className="size-3.5" />
      </Button>
      <label className={styles.center} htmlFor="intake-quantity">
        <span className={styles.quantityGroup}>
          {originalQuantityPreserved && (
            <span
              className={styles.approximate}
              title={legacyDescription}
              aria-hidden="true"
              data-intake-amount-approximate
            >
              ≈
            </span>
          )}
          <Input
            id="intake-quantity"
            value={shown}
            onChange={(event) => {
              const nativeComposing =
                "isComposing" in event.nativeEvent &&
                event.nativeEvent.isComposing === true;
              if (composing.current || nativeComposing)
                setComposition(event.target.value);
              else commit(event.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
              setComposition(value);
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setComposition(null);
              commit(event.currentTarget.value);
            }}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            maxLength={256}
            role="spinbutton"
            aria-labelledby="intake-quantity-label"
            aria-describedby={
              empty
                ? undefined
                : `intake-amount-calculation intake-amount-dose${originalQuantityPreserved ? " intake-amount-original" : ""}`
            }
            aria-valuemin={
              originalQuantityPreserved && parsed === 0
                ? 0
                : MIN_EDITABLE_INTAKE_QUANTITY
            }
            aria-valuemax={MAX_INTAKE_QUANTITY}
            aria-valuenow={parsed ?? undefined}
            aria-valuetext={`${originalQuantityPreserved ? "Approximately " : ""}${shown} ${unit}`}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            required
            className={styles.valueInput}
            style={
              {
                width: `calc(${Math.max(1, Math.min(shown.length, 8))}ch + 2px)`,
              } as CSSProperties
            }
            onKeyDown={(event) => {
              if (
                !composing.current &&
                !event.nativeEvent.isComposing &&
                parsed !== null &&
                (event.key === "ArrowUp" || event.key === "ArrowDown")
              ) {
                event.preventDefault();
                if (event.key === "ArrowUp") onStep(increment);
                else if (parsed > increment) onStep(-increment);
              }
            }}
          />
          {!empty && (
            <span className={styles.iconGroup}>
              <IntakeRouteIcon
                route={route}
                className={styles.glyph}
                strokeWidth={2.5}
              />
              <span role="img" aria-label={getMedicationType(form).label}>
                <MedicationTypeIcon
                  type={form}
                  className={styles.glyph}
                  strokeWidth={2.5}
                />
              </span>
            </span>
          )}
        </span>
        {!empty && (
          <>
            <span className={styles.doseGroup}>
              <span
                id="intake-amount-calculation"
                className={styles.calculation}
                title={`Strength per ${getMedicationType(form).unit}: ${formatDose(strengthMg)} mg`}
                aria-label={`Multiplied by ${formatDose(strengthMg)} milligrams per ${getMedicationType(form).unit}`}
              >
                <span aria-hidden="true">×</span>{" "}
                <strong>{formatDose(strengthMg)}</strong> <span>mg</span>
              </span>
              <span className={styles.separator} aria-hidden="true">
                ·
              </span>
              <span
                id="intake-amount-dose"
                className={styles.dose}
                title={`Calculated dose: ${doseRounded ? "approximately " : ""}${dose} mg`}
                data-intake-amount-dose
                aria-label={`Calculated dose: ${doseRounded ? "approximately " : ""}${dose === "—" ? "not available" : `${dose} milligrams`}`}
              >
                <strong>{doseRounded ? `≈${dose}` : dose}</strong>{" "}
                <span>mg</span>
              </span>
            </span>
            <span className={`${styles.iconGroup} ${styles.medicationIcons}`}>
              <span
                role="img"
                aria-label="Selected medication symbol"
                data-intake-medication-outline={outlineIcon ?? form}
                style={{ rotate: `${medicationIconRotation}deg` }}
              >
                {outlineIcon ? (
                  <MedicationGlyph
                    icon={outlineIcon}
                    className={styles.glyph}
                  />
                ) : (
                  <MedicationTypeIcon
                    type={form}
                    className={styles.glyph}
                    strokeWidth={2.5}
                  />
                )}
              </span>
              {categories.map((kind) => (
                <MedicationIndicatorMark
                  key={kind}
                  kind={kind}
                  size={14}
                  strokeWidth={2.5}
                  outline
                  className={styles.categoryGlyph}
                />
              ))}
            </span>
          </>
        )}
        {originalQuantityPreserved && (
          <span id="intake-amount-original" className="sr-only">
            {legacyDescription}
          </span>
        )}
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={styles.stepButton}
        data-dialog-corner="compact"
        data-intake-amount-step="increase"
        aria-label="Increase amount"
        aria-describedby="intake-amount-step-hint"
        disabled={
          disabled ||
          composition !== null ||
          parsed === null ||
          parsed >= MAX_INTAKE_QUANTITY
        }
        onClick={() => onStep(increment)}
      >
        <ActionIcon name="add" weight="bold" className="size-3.5" />
      </Button>
    </div>
  );
}
