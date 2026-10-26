import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Compact, center-aligned title/context with optional metadata on the other side. */
export function HeadingText({
  title,
  context,
  trailing,
  separator = "/",
  className,
}: {
  title: ReactNode;
  context?: ReactNode;
  trailing?: ReactNode;
  separator?: "/" | "·";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-heading min-w-0">{title}</span>
        {context != null && (
          <span className="inline-flex max-w-full items-center gap-1.5 font-sans text-[11px] font-normal leading-4 tracking-normal text-muted-foreground">
            <span
              aria-hidden="true"
              className="shrink-0 text-muted-foreground/50"
            >
              {separator}
            </span>
            <span className="sr-only">, </span>
            <span>{context}</span>
          </span>
        )}
      </span>
      {trailing != null && (
        <span className="shrink-0 text-right font-sans text-[10px] font-normal leading-4 tracking-normal text-muted-foreground tabular-nums">
          {trailing}
        </span>
      )}
    </span>
  );
}
