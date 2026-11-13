import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import { PillCount } from "@/components/pill-count";
import type { PillCounts } from "@/lib/pill-counts";

export function IntakeSummary({
  count,
  pillCounts,
  today = false,
}: {
  count: number;
  pillCounts: PillCounts;
  today?: boolean;
}) {
  return (
    <div className="intake-summary-row" data-intake-summary>
      <h2
        className="intake-summary-title"
        aria-label={`${count} ${count === 1 ? "intake" : "intakes"} logged ${today ? "today" : "on this day"}`}
      >
        <IntakeLogSymbol className="intake-summary-symbol" />
        <span className="intake-summary-label">
          Logged <strong>{count}</strong>
        </span>
      </h2>
      <PillCount counts={pillCounts} appearance="summary" />
    </div>
  );
}
