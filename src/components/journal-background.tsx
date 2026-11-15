/** CSS-only page paint is shared with pre-hydration, loading and offline views. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="static-plum"
      data-motion-profile="static"
      aria-hidden="true"
    />
  );
}
