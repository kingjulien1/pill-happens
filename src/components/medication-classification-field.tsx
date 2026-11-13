"use client";

import { useState } from "react";
import { Select } from "@base-ui/react/select";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import { ActionIcon } from "@/components/action-icon";
import {
  ChoiceMenuHeader,
  ChoiceOptionContent,
} from "@/components/choice-menu";
import { MedicationCategoryIcon } from "@/components/medication-category-icon";
import { SelectItem } from "@/components/ui/select";
import {
  MEDICATION_CATEGORIES,
  getMedicationCategory,
  normalizeMedicationCategories,
  type MedicationCategory,
} from "@/lib/medication-categories";
import styles from "./medication-classification-field.module.css";

export function MedicationClassificationField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: MedicationCategory[];
  onChange: (value: MedicationCategory[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeMedicationCategories(value);
  const selected = normalized.map(getMedicationCategory);
  const summary = selected.map((item) => item.label).join(", ");

  return (
    <div className={styles.field}>
      <Select.Root<MedicationCategory, true>
        id={id}
        multiple
        value={normalized}
        onValueChange={(next) => onChange(normalizeMedicationCategories(next))}
        items={MEDICATION_CATEGORIES}
        itemToStringLabel={(category) => getMedicationCategory(category).label}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        highlightItemOnHover={false}
        disabled={disabled}
      >
        <label htmlFor={id} className={styles.label}>
          Categories
        </label>
        <Select.Trigger
          id={id}
          aria-label="Medication Categories"
          aria-description={
            summary || "Optional manual labels. Choose one or more."
          }
          title={summary || "Choose Medication Categories"}
          className={styles.trigger}
          data-medication-classification-select
          data-compact-choice-trigger
        >
          <span
            className={`${styles.optionIcon} ${styles.triggerIcon}`}
            data-category-kind={
              selected.length === 1 ? selected[0].value : undefined
            }
            aria-hidden="true"
          >
            {selected.length === 1 ? (
              <MedicationCategoryIcon category={selected[0].value} />
            ) : (
              <TagIcon size={14} weight="bold" aria-hidden="true" />
            )}
          </span>
          <span className={styles.triggerText} data-choice-trigger-label>
            {selected.length > 1 ? (
              <>
                {selected.length}
                <span className={styles.countSuffix}> labels</span>
              </>
            ) : (
              (selected[0]?.shortLabel ?? "None")
            )}
          </span>
          <Select.Icon
            data-slot="select-trigger-icon"
            className="pointer-events-none flex shrink-0 items-center text-muted-foreground"
          >
            <ActionIcon name="expand" className="size-3" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            align="end"
            sideOffset={6}
            collisionPadding={12}
            alignItemWithTrigger={false}
            className={styles.positioner}
          >
            <Select.Popup
              className={styles.popup}
              aria-label="Choose Medication Categories"
              data-medication-category-menu
              data-choice-menu="category"
            >
              <ChoiceMenuHeader
                title="Medication Categories"
                hint="Pick several"
              />
              <Select.List
                className={styles.list}
                aria-label="Medication Category Options"
              >
                {MEDICATION_CATEGORIES.map((item) => {
                  const current = normalized.includes(item.value);
                  return (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      label={item.label}
                      className={styles.option}
                      data-category-option={item.value}
                      data-choice-option
                      data-current={current || undefined}
                      data-choice-secondary={
                        item.value === "other" || undefined
                      }
                    >
                      <ChoiceOptionContent
                        current={current}
                        currentLabel="selected"
                        icon={
                          <span
                            className={styles.optionIcon}
                            data-category-kind={item.value}
                            aria-hidden="true"
                          >
                            <MedicationCategoryIcon category={item.value} />
                          </span>
                        }
                        label={item.label}
                      />
                    </SelectItem>
                  );
                })}
              </Select.List>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.clear}
                  disabled={disabled || !normalized.length}
                  onClick={() => onChange([])}
                >
                  Clear{normalized.length ? ` ${normalized.length}` : ""}
                </button>
                <span>{MEDICATION_CATEGORIES.length} options</span>
                <button
                  type="button"
                  className={styles.done}
                  disabled={disabled}
                  onClick={() => setOpen(false)}
                >
                  Done <ActionIcon name="selected" className="size-3" />
                </button>
              </div>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
