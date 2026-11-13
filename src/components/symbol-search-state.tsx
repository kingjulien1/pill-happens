import { Flower2, Pill, Smile, Sparkles } from "lucide-react";
import styles from "./symbol-search-state.module.css";

export function SymbolSearchState({
  phase,
}: {
  phase: "idle" | "loading" | "empty";
}) {
  const messages = {
    idle: ["Find Your Symbol", "Try “leaf”, “outline”, or an emoji."],
    loading: ["Finding your match", "A few possibilities, coming into focus."],
    empty: [
      "Nothing quite matches yet",
      "Try a shorter word, or paste an emoji.",
    ],
  };

  return (
    <div className={styles.state} data-symbol-state={phase}>
      {phase === "loading" ? (
        <div className={styles.scene} aria-hidden="true">
          <span className={styles.halo} />
          <span className={styles.arcWide} />
          <span className={styles.arcInner} />
          <span className={styles.orbit}>
            <span />
          </span>
          <span className={`${styles.token} ${styles.pill}`}>
            <Pill strokeWidth={2} />
          </span>
          <span className={`${styles.token} ${styles.flower}`}>
            <Flower2 strokeWidth={2} />
          </span>
          <span className={`${styles.token} ${styles.smile}`}>
            <Smile strokeWidth={2} />
          </span>
          <span className={`${styles.token} ${styles.emoji}`}>
            <span>🌈</span>
          </span>
          <span className={styles.core}>
            <span className={styles.sheen} />
            <Sparkles strokeWidth={2} />
          </span>
          <span className={`${styles.glint} ${styles.glintFirst}`}>
            <Sparkles strokeWidth={1.8} />
          </span>
          <span className={`${styles.glint} ${styles.glintSecond}`}>
            <Sparkles strokeWidth={1.8} />
          </span>
        </div>
      ) : (
        <div className={styles.palette} aria-hidden="true">
          <span className={`${styles.sample} ${styles.pill}`}>
            <Pill strokeWidth={1.8} />
          </span>
          <span className={`${styles.sample} ${styles.flower}`}>
            <Flower2 strokeWidth={1.8} />
          </span>
          <span className={`${styles.sample} ${styles.emoji}`}>🌈</span>
        </div>
      )}
      <div className={styles.copy}>
        <p className={styles.title}>{messages[phase][0]}</p>
        <p className={styles.description}>{messages[phase][1]}</p>
      </div>
    </div>
  );
}
