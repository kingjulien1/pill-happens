"use client";

import { useId } from "react";
import { Check, Monitor, MoonStar, Sun } from "lucide-react";
import { useAppearance } from "./appearance-provider";
import { SaveStatusLine } from "./save-status-line";
import { ResponsiveModal } from "./responsive-modal";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import { APP_FOUNDATION } from "@/lib/app-theme";
import styles from "./appearance-menu.module.css";

const options = [
  {
    value: "light",
    label: "Light & bright",
    description: "Soft Lilac, clear daylight",
    Icon: Sun,
    swatches: [
      APP_FOUNDATION.white,
      APP_FOUNDATION.lilac,
      APP_FOUNDATION.apricot,
    ],
  },
  {
    value: "dark",
    label: "Dark & cozy",
    description: "Deep Plum, a softer glow",
    Icon: MoonStar,
    swatches: [
      APP_FOUNDATION.plum,
      APP_FOUNDATION.lilac,
      APP_FOUNDATION.apricot,
    ],
  },
  {
    value: "system",
    label: "Follow your device",
    description: "Changes with your system",
    Icon: Monitor,
    swatches: [APP_FOUNDATION.white, APP_FOUNDATION.plum, APP_FOUNDATION.lilac],
  },
] as const;

export function AppearanceDialog({
  open,
  onClose,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { preference, resolved, setPreference, persisted } = useAppearance();
  const group = useId();
  const dark = resolved === "dark";
  const ModeIcon = dark ? MoonStar : Sun;
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed();
      }}
      headerVariant="check-in"
      title="Appearance"
      context={
        <JournalDialogSubheading title="Reading light" detail="This device" />
      }
      description="Choose a palette for your journal. Follow your device to switch automatically when its light or dark setting changes."
    >
      <div data-appearance-menu className={styles.body}>
        <div className={styles.sample} data-mode={resolved}>
          <ModeIcon size={25} aria-hidden="true" />
          <div>
            <small>Live preview</small>
            <strong>{dark ? "Dark & cozy" : "Light & bright"}</strong>
          </div>
          <span>
            {preference === "system" ? "Device setting" : "Your choice"}
          </span>
        </div>
        <fieldset className={styles.choices}>
          <legend>Color mode</legend>
          {options.map(({ value, label, description, Icon, swatches }) => (
            <label
              key={value}
              className={styles.choice}
              data-active={value === preference}
              data-appearance-option={value}
            >
              <input
                type="radio"
                name={group}
                value={value}
                checked={preference === value}
                onChange={() => setPreference(value)}
              />
              <Icon className={styles.mark} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <span className={styles.swatches} aria-hidden="true">
                {swatches.map((color) => (
                  <i key={color} style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className={styles.check} aria-hidden="true">
                {preference === value && <Check size={13} />}
              </span>
            </label>
          ))}
        </fieldset>
        <footer className={styles.footer}>
          <SaveStatusLine
            text={persisted ? "Saved on this device" : "This visit only"}
            tone={persisted ? "normal" : "warning"}
          />
          <button type="button" onClick={onClose}>
            Done <Check size={15} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </ResponsiveModal>
  );
}
