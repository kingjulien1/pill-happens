import { Iridescence } from "./iridescence";

/** Base light, accent mesh, mauve glaze, then the foreground iridescence field. */
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
      <div
        className="ambient-iridescence-overlay"
        data-background-layer="iridescence-overlay"
      >
        <Iridescence />
      </div>
    </div>
  );
}
