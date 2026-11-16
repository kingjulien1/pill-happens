"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  BookOpenText,
  ArrowUpRight,
  CircleCheck,
  CloudDownload,
  BugPlay,
  Braces,
  X,
} from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { AppearanceMenu } from "@/components/appearance-menu";
import { BrandMark } from "@/components/brand";
import { NavigationMenuMark } from "@/components/navigation-menu-mark";
import { useJournal } from "@/components/journal-provider";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { dayIntakes, dayKey, goalForDay } from "@/lib/domain";
import { journalDays } from "@/lib/daily-check-in";
import { journalLibraryEntries } from "@/lib/journal-library";
import { cn } from "@/lib/utils";
import { getBrandThemeStyle } from "@/lib/action-button-system";
import styles from "./header-menus.module.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const links = [
  {
    href: "/",
    label: "Today",
    page: "today",
    icon: "navToday",
    description: "Your intakes and a little reflection",
    tone: "peach",
  },
  {
    href: "/journal",
    label: "Journal",
    page: "journal",
    icon: "record",
    description: "Longer thoughts, kept as pages",
    tone: "lilac",
  },
  {
    href: "/history",
    label: "Past Days",
    page: "history",
    icon: "navHistory",
    description: "Pick up the thread of any day",
    tone: "sky",
  },
  {
    href: "/medications",
    label: "Medications",
    page: "medications",
    icon: "navMedications",
    description: "Names, strengths and familiar symbols",
    tone: "mint",
  },
  {
    href: "/goals",
    label: "Goals",
    page: "goals",
    icon: "navGoals",
    description: "Your daily limits, in one place",
    tone: "rose",
  },
] as const;

const countCaption = (
  value: number,
  singular: string,
  plural = `${singular}s`,
) => `${value} ${value === 1 ? singular : plural}`;

function MenuRow({
  label,
  description,
  icon,
  detail,
  active = false,
  tone,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  detail?: string;
  active?: boolean;
  tone: string;
}) {
  return (
    <>
      <span className={styles.iconTile} data-tone={tone}>
        {icon}
      </span>
      <span className={styles.copy}>
        <span className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          {detail && (
            <span className={styles.detail}>
              <span className={styles.detailDot} aria-hidden="true">
                ·
              </span>
              <strong>{detail.split(" ")[0]}</strong>{" "}
              {detail.split(" ").slice(1).join(" ")}
            </span>
          )}
        </span>
        <span className={styles.description}>{description}</span>
      </span>
      <span className={styles.trailing} aria-hidden="true">
        {active ? (
          <CircleCheck className={styles.selection} strokeWidth={2.4} />
        ) : (
          <ArrowUpRight className={styles.chevron} strokeWidth={2.4} />
        )}
      </span>
    </>
  );
}

const desktopQuery = "(min-width: 768px)";
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

export function HeaderNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreAfterResize = useRef(false);
  const subscribeLayout = useCallback((listener: () => void) => {
    const query = window.matchMedia(desktopQuery);
    const change = () => {
      const focused = document.activeElement;
      restoreAfterResize.current = Boolean(
        focused &&
        (focused === triggerRef.current ||
          document.querySelector("[data-navigation-menu]")?.contains(focused) ||
          document.querySelector("[data-appearance-menu]")?.contains(focused)),
      );
      listener();
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const desktop = useSyncExternalStore(
    subscribeLayout,
    desktopSnapshot,
    serverSnapshot,
  );
  // The old popup resolves finalFocus before the replacement trigger mounts.
  useLayoutEffect(() => {
    if (!restoreAfterResize.current) return;
    restoreAfterResize.current = false;
    triggerRef.current?.focus({ preventScroll: true });
  }, [desktop]);
  return (
    <NavigationMenu
      key={`${pathname}:${desktop ? "menu" : "dialog"}`}
      pathname={pathname}
      mobile={!desktop}
      className={className}
      triggerRef={triggerRef}
    />
  );
}

/** Native links in the modal; menu semantics and typeahead on desktop. */
function NavigationLink({
  mobile,
  label,
  href,
  external = false,
  prefetch,
  onNavigate,
  onFollow,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLAnchorElement>, "onClick"> & {
  mobile: boolean;
  label: string;
  href: string;
  external?: boolean;
  prefetch?: false;
  onNavigate?: () => void;
  onFollow: () => void;
}) {
  const follow = () => {
    onNavigate?.();
    onFollow();
  };
  const host = external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onFollow}
    />
  ) : (
    <Link href={href} prefetch={prefetch} onNavigate={follow} />
  );
  if (!mobile)
    return (
      <Menu.LinkItem render={host} label={label} closeOnClick {...props}>
        {children}
      </Menu.LinkItem>
    );
  return external ? (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onFollow}
    >
      {children}
    </a>
  ) : (
    <Link {...props} href={href} prefetch={prefetch} onNavigate={follow}>
      {children}
    </Link>
  );
}

function NavigationMenu({
  pathname,
  mobile,
  className,
  triggerRef,
}: {
  pathname: string;
  mobile: boolean;
  className?: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const followingLink = useRef(false);
  const { data, now } = useJournal();
  const workspace = useJournalWorkspace();
  const today = data && now ? dayKey(now, data.settings.timezone) : null;
  const details =
    open && data && now && today
      ? {
          today: countCaption(
            dayIntakes(data, today).length,
            "entry",
            "entries",
          ),
          journal: countCaption(
            journalLibraryEntries(data.dailyCheckIns).length,
            "page",
          ),
          history: countCaption(
            journalDays(
              data.intakes,
              data.dailyCheckIns,
              data.settings.timezone,
            ).filter((day) => day < today).length,
            "day",
          ),
          medications: `${data.medications.filter((medication) => !medication.archived).length} active`,
          goals: `${data.medications.filter((medication) => !medication.archived && goalForDay(data, medication.id, today)).length} active`,
        }
      : null;
  const followLink = () => {
    followingLink.current = true;
    setOpen(false);
  };
  const returnFocus = () =>
    !followingLink.current && triggerRef.current?.isConnected
      ? triggerRef.current
      : false;
  const changeOpen = (next: boolean) => {
    if (next) followingLink.current = false;
    setOpen(next);
  };
  const Title = mobile ? DialogTitle : "p";
  const Description = mobile ? DialogDescription : "p";
  const Group = mobile ? "div" : Menu.Group;
  const Separator = mobile ? "div" : Menu.Separator;
  const contents = (
    <>
      <div className={styles.masthead} data-navigation-masthead>
        <span
          className={styles.mastheadIcon}
          style={getBrandThemeStyle()}
          aria-hidden="true"
          data-navigation-brand
        >
          <BrandMark className={styles.navigationLogo} />
        </span>
        <div className={styles.mastheadCopy}>
          <Title className={styles.title}>Your Journal</Title>
          <Description className={styles.subtitle}>
            Your daily launchpad.
          </Description>
        </div>
        <div
          className={styles.headerActions}
          role="group"
          aria-label="Navigation controls"
          data-navigation-header-actions
        >
          <AppearanceMenu nested={!mobile} />
          {mobile ? (
            <DialogClose
              render={<Button variant="ghost" size="icon" type="button" />}
              aria-label="Close navigation"
              title="Close navigation"
              className={`${styles.headerAction} ${styles.navigationClose}`}
              data-navigation-close
            >
              <X aria-hidden="true" strokeWidth={2.1} />
            </DialogClose>
          ) : (
            <Menu.Item
              render={<Button variant="ghost" size="icon" type="button" />}
              nativeButton
              closeOnClick
              label="Close navigation"
              aria-label="Close navigation"
              title="Close navigation"
              className={`${styles.headerAction} ${styles.navigationClose}`}
              data-navigation-close
            >
              <X aria-hidden="true" strokeWidth={2.1} />
            </Menu.Item>
          )}
        </div>
      </div>
      <Separator
        role="separator"
        className={styles.introSeparator}
        data-navigation-intro-separator
      />
      <div className={styles.scrollArea} data-navigation-scroll>
        <Group aria-label="Journal pages" data-navigation-section="daily">
          <div className={styles.entries}>
            {links.map(({ href, label, page, icon, description, tone }) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <NavigationLink
                  key={href}
                  mobile={mobile}
                  href={href}
                  label={label}
                  onFollow={followLink}
                  onNavigate={
                    page === "journal"
                      ? () => workspace.rememberDestination(href)
                      : undefined
                  }
                  aria-current={active ? "page" : undefined}
                  data-active={active}
                  data-page={page}
                  data-navigation-link
                  className={styles.entry}
                >
                  <MenuRow
                    label={label}
                    description={description}
                    tone={tone}
                    active={active}
                    detail={details?.[page]}
                    icon={<ActionIcon name={icon} weight="fill" />}
                  />
                </NavigationLink>
              );
            })}
          </div>
        </Group>
        <Group data-navigation-section="resources" aria-label="Getting started">
          <div className={styles.entries}>
            <NavigationLink
              mobile={mobile}
              href="/guide#start"
              prefetch={false}
              label="Getting Started Guide"
              onFollow={followLink}
              aria-current={pathname === "/guide" ? "page" : undefined}
              data-active={pathname === "/guide"}
              data-page="guide"
              data-navigation-link
              className={styles.entry}
            >
              <MenuRow
                label="Getting Started Guide"
                description="Get started. Find your rhythm."
                tone="sand"
                active={pathname === "/guide"}
                icon={<BookOpenText strokeWidth={2.1} />}
              />
            </NavigationLink>
          </div>
        </Group>
      </div>
      <div className={styles.footer} data-navigation-footer>
        <div className={styles.footerNote} data-navigation-footer-links>
          <NavigationLink
            mobile={mobile}
            href="/guide#history"
            prefetch={false}
            label="Backups and Export"
            aria-label="Read about backups and export"
            title="Backups & Export"
            onFollow={followLink}
            className={styles.footerLink}
            data-navigation-backups
          >
            <CloudDownload aria-hidden="true" strokeWidth={2} />
            <span className={styles.footerLinkLabel}>Backups &amp; Export</span>
          </NavigationLink>
          <NavigationLink
            mobile={mobile}
            href="https://github.com/kingjulien1/pill-happens/issues/new?template=bug_report.yml"
            external
            label="Report a Bug"
            aria-label="Report a Bug (opens in a new tab)"
            title="Report a Bug"
            onFollow={followLink}
            className={styles.footerLink}
            data-navigation-report-bug
          >
            <BugPlay aria-hidden="true" strokeWidth={2} />
            <span className={styles.footerLinkLabel}>Report a Bug</span>
          </NavigationLink>
          <NavigationLink
            mobile={mobile}
            href="/developer-guide"
            prefetch={false}
            label="Developer Guide"
            aria-label="Developer Guide"
            title="Developer Guide"
            onFollow={followLink}
            aria-current={pathname === "/developer-guide" ? "page" : undefined}
            className={styles.footerLink}
            data-navigation-developer-guide
          >
            <Braces aria-hidden="true" strokeWidth={2} />
            <span className={styles.footerLinkLabel}>Developer Guide</span>
          </NavigationLink>
        </div>
        <p className={styles.footerCopy} data-navigation-footer-copy>
          You can wander without losing your place. Past Days takes you back to
          earlier entries, while Backups &amp; Export explains how to keep a
          copy of your journal. The Developer Guide opens the workshop, with
          design notes, setup steps and the code behind the app. If a button
          misbehaves or something feels off, Report a Bug opens the project’s
          bug form. Share what happened, what you expected and a simple way to
          reproduce it; a useful little clue can make the next fix much easier.
        </p>
      </div>
    </>
  );
  const triggerProps = {
    ref: triggerRef,
    "aria-label": "Open navigation",
    className: cn(
      "header-icon-button header-icon-button--compact header-brand-surface",
      className,
    ),
    style: getBrandThemeStyle(),
    "data-navigation-trigger": "",
  };
  if (mobile)
    return (
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger
          {...triggerProps}
          render={<Button variant="ghost" size="icon" type="button" />}
        >
          <span className="header-control-surface" aria-hidden="true" />
          <NavigationMenuMark open={open} />
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          finalFocus={returnFocus}
          className={cn(styles.popup, styles.navigation, styles.mobileDialog)}
          data-navigation-menu
          data-navigation-layout="dialog"
        >
          <nav className={styles.navigationBody} aria-label="Main navigation">
            {contents}
          </nav>
        </DialogContent>
      </Dialog>
    );
  return (
    <Menu.Root open={open} onOpenChange={changeOpen} modal={false}>
      <Menu.Trigger
        {...triggerProps}
        render={<Button variant="ghost" size="icon" type="button" />}
      >
        <span className="header-control-surface" aria-hidden="true" />
        <NavigationMenuMark open={open} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className={styles.positioner}
        >
          <Menu.Popup
            aria-label="Main navigation"
            className={cn(styles.popup, styles.navigation)}
            data-navigation-menu
            data-navigation-layout="menu"
          >
            {contents}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
