"use client";

import {
  ChoiceMenuHeader,
  ChoiceOptionContent,
} from "@/components/choice-menu";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { getMedicationIndicatorKinds } from "@/components/medication-indicator";
import { MedicationIcon } from "@/components/medication-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDose, type Intake, type Medication } from "@/lib/domain";
import { isMeteredMedicationType } from "@/lib/medication-types";

/** The form owns selection and quantity changes; these rows only present choices. */
export function IntakeMedicationSelect({
  medications,
  value,
  fallbackIntake,
  onValueChange,
}: {
  medications: Medication[];
  value: string;
  fallbackIntake?: Intake;
  onValueChange: (value: string) => void;
}) {
  const selected = medications.find((medication) => medication.id === value);
  const selectedClasses = getMedicationIndicatorKinds(selected);
  return (
    <Select
      value={value}
      highlightItemOnHover={false}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={!medications.length}
    >
      <SelectTrigger
        id="intake-medication"
        className="h-10 w-full rounded-xl px-3 text-sm data-[size=default]:h-10"
      >
        <SelectValue>
          {selected ? (
            <>
              <MedicationIcon
                icon={selected.icon}
                color={selected.color}
                rotation={selected.iconRotation}
                small
                className="size-6 rounded-md"
              />
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="min-w-0 truncate" title={selected.name}>
                  {selected.name}
                </span>
                <span className="shrink-0 text-xs">
                  · {formatDose(selected.strengthMg)} mg
                  {isMeteredMedicationType(selected.form) ? " / pump" : ""}
                </span>
                {selectedClasses.map((kind) => (
                  <MedicationIndicatorMark key={kind} kind={kind} size={20} />
                ))}
              </span>
            </>
          ) : fallbackIntake ? (
            `${fallbackIntake.medicationName} · ${formatDose(fallbackIntake.strengthMg)} mg`
          ) : (
            "Choose medication"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        data-intake-medication-menu
        data-choice-menu="medication"
        align="start"
        alignItemWithTrigger={false}
        sideOffset={6}
      >
        <ChoiceMenuHeader title="Medication" count={medications.length} />
        {medications.map((medication) => {
          const classes = getMedicationIndicatorKinds(medication);
          const strength = formatDose(medication.strengthMg);
          const current = value === medication.id;
          return (
            <SelectItem
              key={medication.id}
              value={medication.id}
              label={`${medication.name} ${strength} mg`}
              data-intake-medication-option={medication.id}
              data-choice-option
              data-current={current || undefined}
              className="min-h-10 pl-2.5 pr-9 text-xs"
            >
              <ChoiceOptionContent
                current={current}
                currentLabel="This intake"
                icon={
                  <MedicationIcon
                    icon={medication.icon}
                    color={medication.color}
                    rotation={medication.iconRotation}
                    small
                    className="size-6 rounded-md"
                  />
                }
                label={
                  <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                    <span>
                      {medication.name} · {strength} mg
                      {isMeteredMedicationType(medication.form)
                        ? " / pump"
                        : ""}
                    </span>
                    {classes.map((kind) => (
                      <MedicationIndicatorMark
                        key={kind}
                        kind={kind}
                        size={20}
                      />
                    ))}
                  </span>
                }
              />
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
