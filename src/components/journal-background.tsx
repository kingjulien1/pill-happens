/** The shared canvas is opaque, uniform and follows the resolved CSS appearance. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="plain"
      data-motion-profile="static"
      aria-hidden="true"
    />
  );
}
