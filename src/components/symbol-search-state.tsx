import { Flower2, Pill, Smile, Sparkles } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";

export function SymbolSearchState({
  phase,
}: {
  phase: "idle" | "loading" | "empty";
}) {
  const messages = {
    idle: ["Find Your Symbol", "Try a name, “outline”, or “color”."],
    loading: ["A Little Symbol Hunt…", "Lucide, custom SVGs and emoji."],
    empty: ["No Matches This Time", "Try a different word or an emoji."],
  };

  return (
    <div className="symbol-search-state" data-symbol-state={phase}>
      {phase === "loading" ? (
        <div className="symbol-hunt-scene" aria-hidden="true">
          <span className="symbol-hunt-track" />
          <span className="symbol-hunt-sweep" />
          <span className="symbol-hunt-token symbol-hunt-token--pill">
            <Pill strokeWidth={2.5} />
          </span>
          <span className="symbol-hunt-token symbol-hunt-token--flower">
            <Flower2 strokeWidth={2.5} />
          </span>
          <span className="symbol-hunt-token symbol-hunt-token--smile">
            <Smile strokeWidth={2.5} />
          </span>
          <span className="symbol-hunt-token symbol-hunt-token--emoji">
            <span>🌈</span>
          </span>
          <span className="symbol-hunt-spark symbol-hunt-spark--first">
            <Sparkles strokeWidth={2.5} />
          </span>
          <span className="symbol-hunt-spark symbol-hunt-spark--second">
            <Sparkles strokeWidth={2.5} />
          </span>
          <span className="symbol-hunt-scout">
            <span className="symbol-hunt-scout-glint" />
            <ActionIcon name="discover" weight="duotone" className="size-8" />
          </span>
        </div>
      ) : (
        <span
          className="relative flex size-11 items-center justify-center rounded-xl bg-foreground/5 text-foreground/80"
          aria-hidden="true"
        >
          <ActionIcon name="discover" weight="duotone" className="size-8" />
        </span>
      )}
      <div className="symbol-search-state-copy">
        <p className="text-xs font-medium">{messages[phase][0]}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {messages[phase][1]}
        </p>
      </div>
    </div>
  );
}
