import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("brand-mark size-6 shrink-0", className)}
    >
      <span className="brand-tablet-orbit">
        <span className="brand-tablet-carrier brand-tablet-carrier--first">
          <TabletIcon className="brand-tablet--first" />
        </span>
        <span className="brand-tablet-carrier brand-tablet-carrier--second">
          <TabletIcon className="brand-tablet--second" />
        </span>
      </span>
    </span>
  );
}

function TabletIcon({ className }: { className: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("brand-tablet", className)}
    >
      <circle cx="8" cy="8" r="5.25" />
      <path d="M2.75 8h10.5" />
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
      <span aria-hidden="true" className="brand-corona">
        <span className="brand-corona-track" />
      </span>
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
        pill happens
      </span>
      {children}
    </span>
  );
}
