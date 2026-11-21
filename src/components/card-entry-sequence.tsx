import type { ComponentProps } from "react";

/** Render page cards immediately without observing or measuring the whole page. */
export function CardEntrySequence({
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} data-card-entry-scope>
      {children}
    </div>
  );
}
