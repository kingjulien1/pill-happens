import { Iridescence } from "@/components/iridescence";

/** The same tinted still remains beneath the passive live field and during SSR. */
export function JournalBackground() {
  return (
    <div
      className="ambient"
      data-background="iridescence"
      data-motion-profile="passive"
      aria-hidden="true"
    >
      <Iridescence />
    </div>
  );
}
