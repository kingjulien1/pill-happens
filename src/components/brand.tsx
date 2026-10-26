import Link from "next/link";
import { Tablets } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Tablets
      size={30}
      strokeWidth={3.25}
      aria-hidden="true"
      focusable="false"
      className={cn("size-[30px] shrink-0", className)}
    />
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Pill happens home"
      className={cn(
        "brand-lockup inline-flex min-h-11 items-center justify-center gap-1.5 px-1 text-primary",
        className,
      )}
    >
      <BrandMark />
      <span className="text-xs font-bold leading-none tracking-[-.03em]">
        pill happens.
      </span>
    </Link>
  );
}
