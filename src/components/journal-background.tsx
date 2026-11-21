import { Iridescence } from "./iridescence";

/** The stationary viewport mesh sits above the independently moving light field. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="iridescence"
      data-motion-profile="compositor"
      aria-hidden="true"
    >
      <Iridescence />
    </div>
  );
}
