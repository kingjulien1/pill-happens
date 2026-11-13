"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Monitor, Moon, MoonStar, Sun } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { useAppearance } from "@/components/appearance-provider";
import { cn } from "@/lib/utils";
import { APP_FOUNDATION } from "@/lib/app-theme";
import styles from "./header-menus.module.css";

const options = [
  {
    value: "light",
    label: "Light & bright",
    description: "Soft Lilac, clear daylight",
    Icon: Sun,
    tone: "sand",
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
    tone: "lilac",
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
    tone: "mint",
    swatches: [APP_FOUNDATION.white, APP_FOUNDATION.plum, APP_FOUNDATION.lilac],
  },
] as const;

export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const { preference, resolved, setPreference, persisted } = useAppearance();
  return (
    <Menu.SubmenuRoot open={open} onOpenChange={setOpen}>
      <Menu.SubmenuTrigger
        render={<button type="button" />}
        nativeButton
        openOnHover={false}
        label="Choose color mode"
        className={cn(styles.headerAction, styles.appearanceTrigger)}
        aria-label="Choose color mode"
        title="Choose color mode"
        data-appearance-trigger
      >
        <Sun
          className={styles.lightIcon}
          strokeWidth={2.5}
          aria-hidden="true"
        />
        <Moon
          className={styles.darkIcon}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className={styles.positioner}
        >
          <Menu.Popup
            aria-label="Appearance"
            className={cn(styles.popup, styles.appearance)}
            data-appearance-menu
          >
            <div className={styles.masthead}>
              <span className={styles.mastheadIcon} aria-hidden="true">
                <MoonStar strokeWidth={1.8} />
              </span>
              <div className={styles.mastheadCopy}>
                <p className={styles.title}>Appearance</p>
                <p className={styles.subtitle}>
                  Pick the light that feels right.
                </p>
              </div>
            </div>
            <Menu.Separator className={styles.separator} />
            <Menu.RadioGroup
              value={preference}
              onValueChange={(value) => setPreference(value)}
              aria-label="Color mode"
              className={styles.appearanceOptions}
            >
              {options.map(
                ({ value, label, description, Icon, tone, swatches }) => (
                  <Menu.RadioItem
                    key={value}
                    value={value}
                    label={label}
                    closeOnClick={false}
                    data-active={preference === value}
                    data-appearance-option={value}
                    className={styles.entry}
                  >
                    <span className={styles.iconTile} data-tone={tone}>
                      <Icon strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className={styles.copy}>
                      <span className={styles.labelRow}>
                        <span className={styles.label}>{label}</span>
                      </span>
                      <span className={styles.description}>
                        {preference === value ? "Selected · " : ""}
                        {description}
                      </span>
                    </span>
                    <span className={styles.swatches} aria-hidden="true">
                      {swatches.map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    <Menu.RadioItemIndicator
                      className={styles.modeCheck}
                      keepMounted
                    >
                      <ActionIcon name="selected" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ),
              )}
            </Menu.RadioGroup>
            <div className={cn(styles.footer, styles.appearanceFooter)}>
              <span>
                {persisted ? "Saved on this device" : "This visit only"}
              </span>
              <span className={styles.resolvedMode}>
                {resolved === "dark" ? (
                  <MoonStar aria-hidden="true" />
                ) : (
                  <Sun aria-hidden="true" />
                )}
                {resolved === "dark" ? "Dark right now" : "Light right now"}
              </span>
            </div>
            <Menu.Item
              render={<button type="button" />}
              nativeButton
              closeOnClick={false}
              onClick={() => setOpen(false)}
              label="Close appearance"
              aria-label="Close appearance"
              className={styles.close}
            >
              <ActionIcon name="close" />
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
