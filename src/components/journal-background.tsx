import { Iridescence } from "./iridescence";

/** The accent mesh sits between the base light field and its subtle top layer. */
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
        className="ambient-iridescence-overlay"
        data-background-layer="iridescence-overlay"
      >
        <Iridescence />
      </div>
    </div>
  );
}
