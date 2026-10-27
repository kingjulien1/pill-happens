"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { ActionIcon } from "@/components/action-icon";
import { BrandFace } from "@/components/brand";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/history", label: "Past days", icon: "history" },
  { href: "/medications", label: "Medications", icon: "medications" },
  { href: "/goals", label: "Goals", icon: "goals" },
] as const;

export function BrandNavigation({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <Menu.Root key={pathname} modal={false}>
      <Menu.Trigger
        aria-label="Open navigation"
        className={cn(
          "brand-lockup inline-flex min-h-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-primary",
          className,
        )}
      >
        <BrandFace className="min-w-40 px-4">
          <ActionIcon name="expand" className="brand-menu-chevron size-3.5" />
        </BrandFace>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="center"
          sideOffset={10}
          collisionPadding={12}
          className="z-50"
        >
          <Menu.Popup
            aria-label="Main navigation"
            className="brand-menu max-h-(--available-height) w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-1.5 outline-none"
          >
            {links.map(({ href, label, icon }) => {
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
                  data-page={icon}
                  className="brand-menu-link flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13px] font-medium outline-none"
                >
                  <span
                    className="brand-menu-icon flex size-8 shrink-0 items-center justify-center rounded-lg"
                    data-page={icon}
                  >
                    <ActionIcon name={icon} weight={active ? "fill" : "bold"} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <ActionIcon
                    name={active ? "selected" : "next"}
                    className="brand-menu-indicator size-4"
                  />
                </Menu.LinkItem>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
