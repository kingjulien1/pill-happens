import type { ReactNode } from "react";

/** Shared presentation only: the underlying select/combobox owns interaction. */
export function ChoiceMenuHeader({
  title,
  count,
  hint,
}: {
  title: string;
  count?: number;
  hint?: string;
}) {
  return (
    <div className="choice-menu-heading">
      <span>{title}</span>
      {(hint || count !== undefined) && (
        <span>
          <span aria-hidden="true">·</span>
          {hint ?? `${count} ${count === 1 ? "option" : "options"}`}
        </span>
      )}
    </div>
  );
}

/** ItemIndicator remains owned by the native Base UI option. */
export function ChoiceOptionContent({
  icon,
  label,
  current,
  currentLabel = "selected",
}: {
  icon: ReactNode;
  label: ReactNode;
  current: boolean;
  currentLabel?: string;
}) {
  return (
    <>
      <span data-choice-icon>{icon}</span>
      <span data-choice-label>{label}</span>
      {current && (
        <span data-choice-current-label aria-hidden="true">
          <span aria-hidden="true">·</span>
          {currentLabel}
        </span>
      )}
    </>
  );
}
