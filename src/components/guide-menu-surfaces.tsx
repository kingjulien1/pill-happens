import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  Check,
  Moon,
  PillBottle,
  Sun,
} from "lucide-react";
import { APP_THEME_TOKENS, type AppThemeMode } from "@/lib/app-theme";
import styles from "./guide-menu-surfaces.module.css";

const rows = [
  { title: "Today", detail: "Your daily log", icon: Sun, state: "rest" },
  {
    title: "Journal",
    detail: "Longer thoughts, kept together",
    icon: BookOpenText,
    state: "selected",
  },
  {
    title: "Medications",
    detail: "Names, strengths and familiar symbols",
    icon: PillBottle,
    state: "hover",
  },
] as const;

/** Read-only specimens use the same canonical role values as the live menus. */
export function GuideMenuSurfaces() {
  return (
    <div className={styles.examples} data-guide-menu-examples>
      {(["light", "dark"] as const).map((mode: AppThemeMode) => {
        const paint = Object.fromEntries(
          APP_THEME_TOKENS.filter((role) => role.group === "menus").map(
            (role) => [role.token, role[mode]],
          ),
        ) as CSSProperties;
        const ModeIcon = mode === "light" ? Sun : Moon;
        return (
          <figure className={styles.example} style={paint} key={mode}>
            <figcaption className={styles.caption}>
              <ModeIcon aria-hidden="true" size={16} strokeWidth={2} />
              <strong>{mode === "light" ? "Light mode" : "Dark mode"}</strong>
              <span>{mode === "light" ? "Indigo paper" : "Indigo depth"}</span>
            </figcaption>
            <div
              className={styles.preview}
              data-menu-surface
              data-guide-menu-example={mode}
            >
              <p className={styles.previewTitle}>Journal shortcuts</p>
              <ul className={styles.rows}>
                {rows.map(({ title, detail, icon: Icon, state }) => (
                  <li className={styles.row} data-state={state} key={title}>
                    <span className={styles.icon}>
                      <Icon aria-hidden="true" size={20} strokeWidth={2} />
                    </span>
                    <span className={styles.copy}>
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </span>
                    {state === "selected" ? (
                      <Check aria-label="Selected" size={17} strokeWidth={2} />
                    ) : (
                      <ArrowUpRight aria-hidden="true" size={15} />
                    )}
                  </li>
                ))}
              </ul>
              <p className={styles.note}>Rest · Selected · Hover preview</p>
            </div>
          </figure>
        );
      })}
    </div>
  );
}
