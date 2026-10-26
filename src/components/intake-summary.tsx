import { Clock3 } from "lucide-react";
import { HeadingText } from "@/components/heading-text";

export function IntakeSummary({ count }: { count: number }) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      data-intake-summary
    >
      <h2 className="text-sm font-medium">
        <HeadingText title="Entries" context={`${count} logged`} />
      </h2>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <Clock3 size={10} aria-hidden="true" />
        In order logged
      </span>
    </div>
  );
}
