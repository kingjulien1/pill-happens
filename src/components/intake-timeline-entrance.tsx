import type { ComponentProps } from "react";

/** Timeline content is ready immediately; disclosure owns its short transition. */
export function IntakeTimelineEntrance({
  children,
  className = "intake-timeline",
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} className={className} data-log-entry-scope>
      {children}
    </div>
  );
}
