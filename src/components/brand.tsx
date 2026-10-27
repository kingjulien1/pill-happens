import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("brand-mark size-[17px] shrink-0", className)}
    >
      <g transform="translate(6.5 6.5)">
        <g className="brand-tablet brand-tablet--first">
          <circle r="4.8" />
          <path d="m-3.39 3.39 6.78-6.78" />
        </g>
      </g>
      <g transform="translate(17.5 17.5)">
        <g className="brand-tablet brand-tablet--second">
          <circle r="4.8" />
          <path d="M-4.8 0h9.6" />
        </g>
      </g>
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Pill happens home"
      className={cn(
        "brand-lockup inline-flex h-11 items-center justify-center",
        className,
      )}
    >
      <BrandFace />
    </Link>
  );
}

/** Shared artwork only: the caller provides link or button semantics. */
export function BrandFace({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "brand-bar inline-flex h-9 min-w-34 items-center justify-center gap-2 px-4",
        className,
      )}
    >
      <BrandMark />
      <span className="text-xs font-[550] leading-none tracking-[-.015em]">
        pill happens.
      </span>
      {children}
    </span>
  );
}
