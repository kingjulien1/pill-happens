import Link from "next/link";
import { Tablets } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Tablets
      size={20}
      strokeWidth={3}
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0", className)}
    />
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Pill happens home"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2.5 rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-primary transition-colors hover:bg-primary/5",
        className,
      )}
    >
      <BrandMark />
      <span className="text-xl font-bold leading-none tracking-[-.035em]">
        pill happens.
      </span>
    </Link>
  );
}
