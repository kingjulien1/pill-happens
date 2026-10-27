import Link from "next/link";
import type { ReactNode } from "react";
import { Tablets } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Tablets
      size={16}
      strokeWidth={3.5}
      aria-hidden="true"
      focusable="false"
      className={cn("size-4 shrink-0", className)}
    />
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Pill happens home"
      className={cn(
        "brand-lockup inline-flex min-h-11 items-center justify-center text-primary",
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
        "brand-bar inline-flex h-10 min-w-36 items-center justify-center gap-2 px-4.5",
        className,
      )}
    >
      <BrandMark />
      <span className="text-xs font-semibold leading-none tracking-[-.02em]">
        pill happens.
      </span>
      {children}
    </span>
  );
}
