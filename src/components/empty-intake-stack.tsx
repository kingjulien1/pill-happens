import { ActionIcon } from "@/components/action-icon";

function DashedOutline({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      <rect
        x="1"
        y="1"
        width="calc(100% - 2px)"
        height="calc(100% - 2px)"
        rx="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="12 8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const blankCards = [
  {
    className: "z-20 -mt-8 h-16 w-[94%] opacity-50",
    outline: "text-primary/40",
  },
  {
    className: "z-10 -mt-7 h-14 w-[88%] opacity-25",
    outline: "text-primary/40",
  },
];

export function EmptyIntakeStack() {
  return (
    <div className="relative isolate flex flex-col items-center">
      <div className="empty-intake-card empty-intake-tint relative z-30 flex min-h-20 w-full items-center justify-center gap-6 rounded-2xl px-6 py-5 text-[#9a3412] dark:text-[#fed7aa]">
        <DashedOutline className="text-primary/40" />
        <ActionIcon name="shootingStar" weight="duotone" className="size-6" />
        <p className="text-base leading-none font-medium whitespace-nowrap">
          No entries yet
        </p>
      </div>
      {blankCards.map(({ className, outline }) => (
        <div
          key={className}
          aria-hidden="true"
          // Hide covered outlines so they cannot show through the translucent fill.
          className={`empty-intake-tint pointer-events-none relative shrink-0 rounded-2xl [clip-path:inset(50%_0_0_0)] ${className}`}
        >
          <DashedOutline className={outline} />
        </div>
      ))}
    </div>
  );
}
