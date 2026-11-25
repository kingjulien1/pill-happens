import { Iridescence } from "./iridescence";

/** The accent mesh and mauve glaze sit above the moving violet field. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="iridescence"
      data-motion-profile="compositor"
      aria-hidden="true"
    >
      <Iridescence />
      <div
        className="ambient-mauve-overlay"
        data-background-layer="mauve-glaze"
      />
    </div>
  );
}
