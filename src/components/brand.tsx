import Link from "next/link";
import { Tablets } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Tablets
      size={22}
      strokeWidth={3.5}
      aria-hidden="true"
      focusable="false"
      className={cn("size-[22px] shrink-0", className)}
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
      <span className="brand-bar inline-flex h-7 items-center justify-center gap-1 px-1.5">
        <BrandMark />
        <span className="text-[10px] font-semibold leading-none tracking-[-.02em]">
          pill happens.
        </span>
      </span>
    </Link>
  );
}
