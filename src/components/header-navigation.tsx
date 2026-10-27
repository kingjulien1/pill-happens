"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { ActionIcon } from "@/components/action-icon";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Today", page: "today", icon: "navToday" },
  { href: "/history", label: "Past days", page: "history", icon: "navHistory" },
  {
    href: "/medications",
    label: "Medications",
    page: "medications",
    icon: "navMedications",
  },
  { href: "/goals", label: "Goals", page: "goals", icon: "navGoals" },
] as const;

export function HeaderNavigation({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <Menu.Root key={pathname} modal={false}>
      <Menu.Trigger
        aria-label="Open navigation"
        className={cn("header-icon-button", className)}
      >
        <ActionIcon name="menu" className="streak-counter-icon size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50"
        >
          <Menu.Popup
            aria-label="Main navigation"
            className="brand-menu brand-navigation max-h-(--available-height) w-52 max-w-[calc(100vw-2rem)] overflow-y-auto p-1 outline-none"
          >
            <Menu.Group>
              <Menu.GroupLabel className="flex h-6 items-center gap-1.5 px-2 text-[11px] font-semibold">
                <span>Journal</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground">
                  <span aria-hidden="true">·</span>
                  <span>{links.length} pages</span>
                </span>
              </Menu.GroupLabel>
              <Menu.Separator className="brand-navigation-separator mx-2 my-0.5 h-px" />
              {links.map(({ href, label, page, icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(`${href}/`));
                return (
                  <Menu.LinkItem
                    key={href}
                    render={<Link href={href} />}
                    label={label}
                    closeOnClick
                    aria-current={active ? "page" : undefined}
                    data-active={active}
                    data-page={page}
                    className="brand-menu-link flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                  >
                    <span
                      className="brand-menu-icon flex size-4 shrink-0 items-center justify-center"
                      data-page={page}
                    >
                      <ActionIcon
                        name={icon}
                        weight="bold"
                        className="size-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {active && (
                      <ActionIcon
                        name="selected"
                        className="brand-menu-indicator size-3.5"
                      />
                    )}
                  </Menu.LinkItem>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
