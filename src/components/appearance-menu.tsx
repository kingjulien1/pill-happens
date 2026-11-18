"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Monitor, Moon, MoonStar, Sun } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { useAppearance } from "@/components/appearance-provider";
import { cn } from "@/lib/utils";
import { APP_FOUNDATION } from "@/lib/app-theme";
import styles from "./header-menus.module.css";
import compact from "./appearance-menu.module.css";
import closeStyles from "./dialog-close.module.css";
import { Button } from "@/components/ui/button";

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

export function AppearanceMenu({ nested = true }: { nested?: boolean }) {
  const [open, setOpen] = useState(false);
  const { preference, resolved, setPreference, persisted } = useAppearance();
  const Root = nested ? Menu.SubmenuRoot : Menu.Root;
  const triggerProps = {
    render: <Button variant="ghost" size="icon" type="button" />,
    className: cn(closeStyles.control, styles.appearanceTrigger),
    "aria-label": "Choose color mode",
    title: "Choose color mode",
    "data-appearance-trigger": true,
  };
  const triggerIcons = (
    <>
      <Sun className={styles.lightIcon} strokeWidth={2.5} aria-hidden="true" />
      <Moon className={styles.darkIcon} strokeWidth={2.5} aria-hidden="true" />
    </>
  );
  return (
    <Root
      open={open}
      onOpenChange={setOpen}
      {...(!nested ? { modal: false } : {})}
    >
      {nested ? (
        <Menu.SubmenuTrigger
          {...triggerProps}
          nativeButton
          openOnHover={false}
          label="Choose color mode"
        >
          {triggerIcons}
        </Menu.SubmenuTrigger>
      ) : (
        <Menu.Trigger {...triggerProps}>{triggerIcons}</Menu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className={cn(styles.positioner, compact.positioner)}
        >
          <Menu.Popup
            aria-label="Appearance"
            className={cn(styles.popup, styles.appearance, compact.panel)}
            data-appearance-menu
          >
            <div className={cn(styles.masthead, compact.masthead)}>
              <span
                className={cn(styles.mastheadIcon, compact.mastheadIcon)}
                aria-hidden="true"
              >
                <MoonStar strokeWidth={1.8} />
              </span>
              <div className={styles.mastheadCopy}>
                <p className={cn(styles.title, compact.title)}>Appearance</p>
                <p className={cn(styles.subtitle, compact.subtitle)}>
                  Pick the light that feels right.
                </p>
              </div>
            </div>
            <Menu.Separator
              className={cn(styles.separator, compact.separator)}
            />
            <Menu.RadioGroup
              value={preference}
              onValueChange={(value) => setPreference(value)}
              aria-label="Color mode"
              className={cn(styles.appearanceOptions, compact.options)}
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
                    className={cn(styles.entry, compact.entry)}
                  >
                    <span
                      className={cn(styles.iconTile, compact.iconTile)}
                      data-tone={tone}
                    >
                      <Icon strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className={cn(styles.copy, compact.copy)}>
                      <span className={styles.labelRow}>
                        <span className={cn(styles.label, compact.label)}>
                          {label}
                        </span>
                      </span>
                      <span
                        className={cn(styles.description, compact.description)}
                      >
                        {preference === value ? "Selected · " : ""}
                        {description}
                      </span>
                    </span>
                    <span
                      className={cn(styles.swatches, compact.swatches)}
                      aria-hidden="true"
                    >
                      {swatches.map((color) => (
                        <i key={color} style={{ background: color }} />
                      ))}
                    </span>
                    <Menu.RadioItemIndicator
                      className={cn(styles.modeCheck, compact.modeCheck)}
                      keepMounted
                    >
                      <ActionIcon name="selected" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ),
              )}
            </Menu.RadioGroup>
            <div
              className={cn(
                styles.footer,
                styles.appearanceFooter,
                compact.footer,
              )}
            >
              <span>
                {persisted ? "Saved on this device" : "This visit only"}
              </span>
              <span className={cn(styles.resolvedMode, compact.resolvedMode)}>
                {resolved === "dark" ? (
                  <MoonStar aria-hidden="true" />
                ) : (
                  <Sun aria-hidden="true" />
                )}
                {resolved === "dark" ? "Dark right now" : "Light right now"}
              </span>
            </div>
            <Menu.Item
              render={<Button variant="ghost" size="icon" type="button" />}
              nativeButton
              closeOnClick={false}
              onClick={() => setOpen(false)}
              label="Close appearance"
              aria-label="Close appearance"
              className={cn(styles.close, compact.close)}
            >
              <ActionIcon name="close" />
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Root>
  );
}
