"use client";

import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import { StackSimpleIcon } from "@phosphor-icons/react/dist/ssr/StackSimple";
import { MedicationClassIcon } from "@/components/medication-class-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEDICATION_CLASSIFICATIONS,
  type MedicationClassification,
} from "@/lib/medication-classification";

const shortLabels = {
  unmarked: "None",
  benzodiazepine: "Benzo",
  opioid: "Opioid",
  both: "Both",
} satisfies Record<MedicationClassification, string>;

export function MedicationClassificationField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: MedicationClassification;
  onChange: (value: MedicationClassification) => void;
  disabled: boolean;
}) {
  const selected = MEDICATION_CLASSIFICATIONS.find(
    (item) => item.value === value,
  )!;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>Class</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (
            next &&
            MEDICATION_CLASSIFICATIONS.some((item) => item.value === next)
          )
            onChange(next as MedicationClassification);
        }}
        highlightItemOnHover={false}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label="Medication Class"
          aria-description={selected.description}
          title={selected.label}
          className="medication-compact-select h-10 w-full rounded-xl px-2 text-xs data-[size=default]:h-10"
          data-medication-classification-select
        >
          <SelectValue className="gap-1.5">
            <span
              className="medication-class-selection-dot"
              data-class-selection={value}
              aria-hidden="true"
            />
            <span>{shortLabels[value]}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          alignItemWithTrigger={false}
          sideOffset={6}
          className="brand-menu brand-navigation medication-class-menu min-w-[240px] max-w-[calc(100vw-32px)] p-1"
        >
          <SelectGroup className="p-0">
            <SelectLabel className="flex h-7 items-center gap-1.5 px-2.5 py-0 text-[11px] font-semibold text-popover-foreground">
              Medication Class
              <span className="text-[10px] font-normal text-muted-foreground">
                · Manual Labels
              </span>
            </SelectLabel>
            <SelectSeparator className="brand-navigation-separator mx-2.5 my-1" />
            {MEDICATION_CLASSIFICATIONS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                label={item.label}
                data-active={value === item.value}
                className="brand-menu-link medication-class-option min-h-11 gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-xs"
              >
                {item.value === "benzodiazepine" || item.value === "opioid" ? (
                  <MedicationClassIcon kind={item.value} />
                ) : item.value === "both" ? (
                  <StackSimpleIcon size={18} weight="bold" aria-hidden="true" />
                ) : (
                  <TagIcon size={18} weight="bold" aria-hidden="true" />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">
                    {item.value === "opioid" ? "Opioid / Opiate" : item.label}
                  </span>
                  <span className="text-[10px] leading-3.5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
