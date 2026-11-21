/** A single mode-aware CSS still keeps the violet field without a render loop. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="iridescence"
      data-motion-profile="still"
      aria-hidden="true"
    />
  );
}
