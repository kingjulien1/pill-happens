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
import {
  INTAKE_ROUTES,
  isIntakeRoute,
  type IntakeRoute,
} from "@/lib/intake-routes";

/** Presentation only: the intake form owns recorded routes and route defaults. */
export function IntakeRouteSelect({
  id = "intake-route",
  value,
  onValueChange,
  disabled = false,
}: {
  id?: string;
  value: IntakeRoute;
  onValueChange: (route: IntakeRoute) => void;
  disabled?: boolean;
}) {
  const selected = INTAKE_ROUTES.find((route) => route.value === value);
  const label = selected?.label ?? "Not specified";

  return (
    <Select
      value={value}
      highlightItemOnHover={false}
      disabled={disabled}
      onValueChange={(next) => {
        if (isIntakeRoute(next)) onValueChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        title={label}
        data-compact-choice-trigger
        className="h-10 w-full rounded-xl px-2 text-xs data-[size=default]:h-10 sm:px-3 sm:text-sm"
      >
        <SelectValue>
          <MedicationChoiceIcon kind="route" value={value} />
          <span className="min-w-0 truncate" data-choice-trigger-label>
            {label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        data-choice-menu="route"
        data-intake-route-menu
        className="choice-menu min-w-[240px] max-w-[calc(100vw-32px)]"
        alignItemWithTrigger={false}
        align="end"
        sideOffset={6}
      >
        <ChoiceMenuHeader title="Intake Route" count={INTAKE_ROUTES.length} />
        {INTAKE_ROUTES.map((route) => {
          const current = route.value === value;
          return (
            <SelectItem
              key={route.value}
              value={route.value}
              label={route.label}
              data-choice-option
              data-choice-secondary={route.value === "other" || undefined}
              data-current={current || undefined}
              data-intake-route-option={route.value}
              className="min-h-10 cursor-pointer py-2 pl-2.5 pr-9 text-xs"
            >
              <ChoiceOptionContent
                icon={<MedicationChoiceIcon kind="route" value={route.value} />}
                label={route.label}
                current={current}
              />
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
