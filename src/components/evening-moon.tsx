import styles from "./evening-moon.module.css";

/** A static crescent preserves the illustration without star timers or observers. */
export function EveningMoon() {
  return (
    <span className={styles.root} data-evening-moon aria-hidden="true">
      <svg className={styles.moon} viewBox="0 0 24 24" data-evening-crescent>
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401Z" />
      </svg>
      <svg className={styles.stars} viewBox="0 0 30 30" fill="currentColor">
        <path d="m23 3 .5 1.5L25 5l-1.5.5L23 7l-.5-1.5L21 5l1.5-.5Z" />
        <path d="m29 20 .4 1.1 1.1.4-1.1.4L29 23l-.4-1.1-1.1-.4 1.1-.4Z" />
      </svg>
    </span>
  );
}
