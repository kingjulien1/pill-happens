import { ActionIcon } from "@/components/action-icon";

export function IntakeSummary({
  count,
  today = false,
}: {
  count: number;
  today?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2"
      data-intake-summary
    >
      <h2 className="flex shrink-0 items-center gap-1 text-[13px] leading-none font-[550] whitespace-nowrap tabular-nums max-[359px]:text-[12.5px]">
        <ActionIcon
          name="confetti"
          weight="fill"
          className="streak-counter-icon size-[22px]"
        />
        <span>
          Logged {count}
          {today ? " Today" : ""}
        </span>{" "}
        <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground max-[359px]:text-[9px]">
          <span
            aria-hidden="true"
            className="size-[3px] shrink-0 rounded-full bg-current"
          />
          <span>{today ? "so far" : "that day"}</span>
        </span>
      </h2>
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] leading-none font-normal whitespace-nowrap text-muted-foreground max-[359px]:text-[9px]">
        <ActionIcon name="calendar" weight="fill" className="size-3.5" />
        <span>06:00 reset</span>
      </span>
    </div>
  );
}
