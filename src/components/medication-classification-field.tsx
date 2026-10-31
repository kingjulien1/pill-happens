"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import { ActionIcon } from "@/components/action-icon";
import { MedicationCategoryIcon } from "@/components/medication-category-icon";
import {
  filterMedicationCategories,
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
  searchQuery,
  onSearchQueryChange,
}: {
  id: string;
  value: MedicationCategory[];
  onChange: (value: MedicationCategory[]) => void;
  disabled: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = searchQuery ?? internalQuery;
  const setQuery = onSearchQueryChange ?? setInternalQuery;
  const items = filterMedicationCategories(query);
  const selected = value.map(getMedicationCategory);
  const summary = selected.map((item) => item.label).join(", ");

  return (
    <div className={styles.field}>
      <Combobox.Root<MedicationCategory, true>
        multiple
        value={value}
        onValueChange={(next) => onChange(normalizeMedicationCategories(next))}
        items={items.map((item) => item.value)}
        filter={null}
        itemToStringLabel={(item) => getMedicationCategory(item).label}
        open={open}
        onOpenChange={(next, details) => {
          if (!next && details.reason === "item-press") {
            details.cancel();
            return;
          }
          setOpen(next);
        }}
        inputValue={query}
        onInputValueChange={(next, details) => {
          // Keep the user's search when the popup/dialog closes. Base UI otherwise
          // clears multiple-selection filters after its exit transition.
          if (details.isItemPress || details.reason !== "input-change")
            details.cancel();
          else setQuery(next);
        }}
        highlightItemOnHover={false}
        disabled={disabled}
      >
        <Combobox.Label className={styles.label}>Categories</Combobox.Label>
        <Combobox.Trigger
          id={id}
          aria-label="Medication Categories"
          aria-description={
            summary || "Optional manual labels. Choose one or more."
          }
          title={summary || "Choose Medication Categories"}
          className={styles.trigger}
          data-medication-classification-select
        >
          {selected.length === 1 ? (
            <MedicationCategoryIcon
              category={selected[0].value}
              className={styles.triggerIcon}
            />
          ) : (
            <TagIcon
              size={13}
              weight="bold"
              className={styles.triggerIcon}
              aria-hidden="true"
            />
          )}
          <span className={styles.triggerText}>
            {selected.length > 1 ? (
              <>
                {selected.length}
                <span className={styles.countSuffix}> labels</span>
              </>
            ) : (
              (selected[0]?.shortLabel ?? "None")
            )}
          </span>
          <ActionIcon name="expand" className="size-3 text-muted-foreground" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className={styles.positioner}
          >
            <Combobox.Popup
              className={styles.popup}
              aria-label="Choose Medication Categories"
              initialFocus={(interaction) =>
                interaction === "touch" ? false : true
              }
              data-medication-category-menu
            >
              <div className={styles.heading}>
                <span>Medication Categories</span>
                <span>Pick Several</span>
              </div>
              <div className={styles.search}>
                <MagnifyingGlassIcon
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                />
                <Combobox.Input
                  aria-label="Search Medication Categories"
                  placeholder="Find a category…"
                  maxLength={80}
                  autoComplete="off"
                  spellCheck={false}
                  className={styles.searchInput}
                />
              </div>
              <Combobox.Empty>
                <div className={styles.empty}>
                  <TagIcon size={23} weight="duotone" aria-hidden="true" />
                  <span>No match. Try another word.</span>
                </div>
              </Combobox.Empty>
              <Combobox.List
                className={styles.list}
                aria-label="Medication Category Options"
              >
                {(category: MedicationCategory) => {
                  const item = getMedicationCategory(category);
                  return (
                    <Combobox.Item
                      key={category}
                      value={category}
                      className={styles.option}
                      data-category-option={category}
                    >
                      <span
                        className={styles.optionIcon}
                        data-category-kind={category}
                      >
                        <MedicationCategoryIcon category={category} />
                      </span>
                      <span className={styles.optionText}>{item.label}</span>
                      <Combobox.ItemIndicator className={styles.indicator}>
                        <ActionIcon name="selected" className="size-3.5" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.clear}
                  disabled={disabled || !value.length}
                  onClick={() => onChange([])}
                >
                  Clear{value.length ? ` ${value.length}` : ""}
                </button>
                <span>
                  {items.length} {items.length === 1 ? "option" : "options"}
                </span>
                <button
                  type="button"
                  className={styles.done}
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Done <ActionIcon name="selected" className="size-3" />
                </button>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
