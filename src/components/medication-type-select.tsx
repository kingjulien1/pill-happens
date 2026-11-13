"use client";

import {
  ChoiceMenuHeader,
  ChoiceOptionContent,
} from "@/components/choice-menu";
import { MedicationChoiceIcon } from "@/components/medication-choice-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Medication } from "@/lib/domain";
import {
  MEDICATION_TYPES,
  MEDICATION_TYPE_VALUES,
} from "@/lib/medication-types";

/** Presentation only: changing a type remains the medication form's decision. */
export function MedicationTypeSelect({
  id,
  value,
  onValueChange,
  disabled = false,
}: {
  id: string;
  value: Medication["form"];
  onValueChange: (type: Medication["form"]) => void;
  disabled?: boolean;
}) {
  const selected = MEDICATION_TYPES.find((type) => type.value === value);
  const label = selected?.label ?? "Other";

  return (
    <Select
      name="form"
      value={value}
      highlightItemOnHover={false}
      disabled={disabled}
      onValueChange={(next) => {
        const type = MEDICATION_TYPE_VALUES.find(
          (candidate) => candidate === next,
        );
        if (type) onValueChange(type);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label="Medication Type"
        title={label}
        data-medication-type-select
        data-compact-choice-trigger
        className="h-10 w-full rounded-xl px-3 text-xs data-[size=default]:h-10"
      >
        <SelectValue>
          <MedicationChoiceIcon kind="type" value={value} />
          <span className="min-w-0 truncate" data-choice-trigger-label>
            {label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        data-choice-menu="type"
        data-medication-type-menu
        className="choice-menu min-w-[240px] max-w-[calc(100vw-32px)]"
        alignItemWithTrigger={false}
        align="end"
        sideOffset={6}
      >
        <ChoiceMenuHeader
          title="Medication Type"
          count={MEDICATION_TYPES.length}
        />
        {MEDICATION_TYPES.map((type) => {
          const current = type.value === value;
          return (
            <SelectItem
              key={type.value}
              value={type.value}
              label={type.label}
              data-choice-option
              data-choice-secondary={type.value === "other" || undefined}
              data-current={current || undefined}
              data-medication-type-option={type.value}
              className="min-h-10 cursor-pointer py-2 pl-2.5 pr-9 text-xs"
            >
              <ChoiceOptionContent
                icon={<MedicationChoiceIcon kind="type" value={type.value} />}
                label={type.label}
                current={current}
              />
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
