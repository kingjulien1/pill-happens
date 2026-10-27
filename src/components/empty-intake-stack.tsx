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
    className: "z-20 -mt-8 h-16 w-[94%] bg-primary/3",
    outline: "text-primary/18",
  },
  {
    className: "z-10 -mt-7 h-14 w-[88%] bg-primary/5",
    outline: "text-primary/24",
  },
];

export function EmptyIntakeStack() {
  return (
    <div className="relative isolate flex flex-col items-center">
      <div className="relative z-30 flex min-h-20 w-full items-center rounded-2xl bg-primary/[0.025] px-4 py-5">
        <DashedOutline className="text-primary/40" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          No entries yet. Use “Log an intake” to record one.
        </p>
      </div>
      {blankCards.map(({ className, outline }) => (
        <div
          key={className}
          aria-hidden="true"
          // Hide covered outlines so they cannot show through the translucent fill.
          className={`pointer-events-none relative shrink-0 rounded-2xl [clip-path:inset(50%_0_0_0)] ${className}`}
        >
          <DashedOutline className={outline} />
        </div>
      ))}
    </div>
  );
}
