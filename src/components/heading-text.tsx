import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A compact title with optional secondary context, shared by pages and dialogs. */
export function HeadingText({
  title,
  context,
  className,
}: {
  title: ReactNode;
  context?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}
    >
      <span className="min-w-0">{title}</span>
      {context != null && (
        <span className="inline-flex max-w-full items-baseline gap-2 text-xs font-normal leading-5 tracking-normal text-muted-foreground">
          <span
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/60"
          >
            ·
          </span>
          <span className="sr-only">, </span>
          <span>{context}</span>
        </span>
      )}
    </span>
  );
}
