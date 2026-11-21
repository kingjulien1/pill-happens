import { MedicationCardIconFrame } from "@/components/medication-card-icon";
import { EveningMoon } from "@/components/evening-moon";
import { MorningCoffee } from "@/components/morning-coffee";
import styles from "./check-in-card-artwork.module.css";

export const CHECK_IN_CARD_COLOR = "tw-violet-400";

/** Repeated card artwork stays still and needs no per-card activity observers. */
export function CheckInCardArtwork({
  period,
}: {
  period: "morning" | "evening";
  replayKey: string;
  dialogOpen?: boolean;
}) {
  return (
    <span
      className={styles.stage}
      data-check-in-artwork={period}
      aria-hidden="true"
    >
      <span className={styles.arrival}>
        <MedicationCardIconFrame
          color={CHECK_IN_CARD_COLOR}
          className={styles.tile}
          style={{
            color: "var(--art-ink)",
            backgroundColor: "var(--check-in-art-base)",
          }}
          data-check-in-icon-tile
        >
          <span className={styles.symbolFloat}>
            {period === "morning" ? (
              <MorningCoffee className={styles.coffee} />
            ) : (
              <EveningMoon />
            )}
          </span>
        </MedicationCardIconFrame>
      </span>
    </span>
  );
}
