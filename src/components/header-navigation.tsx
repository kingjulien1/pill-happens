"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
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
import { dayIntakes, dayKey, formatDay, goalForDay } from "@/lib/domain";
import { checkInForDay, journalDays } from "@/lib/daily-check-in";
import { journalLibraryEntries } from "@/lib/journal-library";
import { cn } from "@/lib/utils";
import { getBrandThemeStyle } from "@/lib/action-button-system";
import styles from "./navigation-panel.module.css";
import dialogStyles from "./responsive-modal.module.css";
import closeStyles from "./dialog-close.module.css";
import checkStyles from "./daily-check-in.module.css";
import controlStyles from "./today-controls.module.css";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const links = [
  {
    href: "/",
    label: "Today",
    page: "today",
    icon: "navToday",
    description: "Intakes and check-ins, together in your current day.",
    facts: ["Morning & Evening", "06:00 Reset"],
    tone: "peach",
  },
  {
    href: "/journal",
    label: "Journal",
    page: "journal",
    icon: "record",
    description: "Your longer thoughts, reflections and linked medications.",
    facts: ["Markdown Pages", "Your Own Words"],
    tone: "lilac",
  },
  {
    href: "/history",
    label: "Past Days",
    page: "history",
    icon: "navHistory",
    description: "Revisit daily intakes, check-ins and the notes you kept.",
    facts: ["Daily Details", "Intakes & Check-Ins"],
    tone: "sky",
  },
  {
    href: "/medications",
    label: "Medications",
    page: "medications",
    icon: "navMedications",
    description: "Keep names, strengths, ingredients and symbols in sync.",
    facts: ["Active & Archived", "Saved Defaults"],
    tone: "mint",
  },
  {
    href: "/goals",
    label: "Goals",
    page: "goals",
    icon: "navGoals",
    description: "Review the daily limits you set for each medication.",
    facts: ["Daily Limits", "Per Medication"],
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
  facts,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  detail?: string;
  active?: boolean;
  tone: string;
  facts?: readonly string[];
}) {
  return (
    <>
      <span className={styles.iconTile} data-tone={tone}>
        {icon}
      </span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        <span className={styles.description}>
          {detail && (
            <>
              {detail}
              <span aria-hidden="true"> · </span>
            </>
          )}
          {facts?.[0] ?? description}
        </span>
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
  const summaries =
    open && data && now && today
      ? (() => {
          const journal = journalLibraryEntries(data.dailyCheckIns);
          const history = journalDays(
            data.intakes,
            data.dailyCheckIns,
            data.settings.timezone,
          ).filter((day) => day < today);
          const activeMedications = data.medications.filter(
            (medication) => !medication.archived,
          );
          const savedCheckIns = (["morning", "evening"] as const).filter(
            (period) => checkInForDay(data.dailyCheckIns, today, period),
          ).length;
          const shortDate = (day: string) =>
            formatDay(day, {
              weekday: undefined,
              month: "short",
              day: "numeric",
            });
          return {
            today: {
              detail: countCaption(
                dayIntakes(data, today).length,
                "entry",
                "entries",
              ),
              facts: [`${savedCheckIns}/2 Check-Ins`, "06:00 Reset"],
            },
            journal: {
              detail: countCaption(journal.length, "page"),
              facts: [
                `${journal.reduce((words, entry) => words + entry.words, 0).toLocaleString("en")} Words`,
                journal[0]
                  ? `Latest ${shortDate(journal[0].day)}`
                  : "A Page Awaits",
              ],
            },
            history: {
              detail: countCaption(history.length, "day"),
              facts: [
                history[0]
                  ? `Latest ${shortDate(history[0])}`
                  : "Starts With Today",
                "Intakes & Check-Ins",
              ],
            },
            medications: {
              detail: `${activeMedications.length} active`,
              facts: [
                `${data.medications.length - activeMedications.length} Archived`,
                "Saved Defaults",
              ],
            },
            goals: {
              detail: `${activeMedications.filter((medication) => goalForDay(data, medication.id, today)).length} active`,
              facts: [
                `${data.goals.filter((goal) => goal.startsOn > today && activeMedications.some((medication) => medication.id === goal.medicationId)).length} Upcoming`,
                "Per Medication",
              ],
            },
          };
        })()
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
  const Title = mobile ? DrawerTitle : "p";
  const Description = mobile ? DrawerDescription : "p";
  const Group = mobile ? "div" : Menu.Group;
  const Separator = mobile ? "div" : Menu.Separator;
  const contents = (
    <>
      <div
        className={cn(
          dialogStyles.headingRow,
          dialogStyles.checkInHeader,
          styles.menuHeading,
        )}
        data-navigation-masthead
      >
        <div className={dialogStyles.headingCopy}>
          <Title className={dialogStyles.title}>
            <span className={styles.titleLine}>
              <BrandMark className={styles.titleMark} />
              Your Journal
            </span>
          </Title>
          {today && (
            <time className={checkStyles.headerDate} dateTime={today}>
              {formatDay(today, {
                weekday: "long",
                month: undefined,
                day: undefined,
              })}
              <small>
                / {formatDay(today, { weekday: undefined, month: "long" })}
              </small>
            </time>
          )}
        </div>
        <div
          className={closeStyles.actions}
          role="group"
          aria-label="Navigation controls"
          data-navigation-header-actions
        >
          <AppearanceMenu nested={!mobile} />
          {mobile ? (
            <DrawerClose
              render={<Button variant="ghost" size="icon" type="button" />}
              aria-label="Close navigation"
              title="Close navigation"
              className={closeStyles.control}
              data-navigation-close
            >
              <X aria-hidden="true" strokeWidth={2.1} />
            </DrawerClose>
          ) : (
            <Menu.Item
              render={<Button variant="ghost" size="icon" type="button" />}
              nativeButton
              closeOnClick
              label="Close navigation"
              aria-label="Close navigation"
              title="Close navigation"
              className={closeStyles.control}
              data-navigation-close
            >
              <X aria-hidden="true" strokeWidth={2.1} />
            </Menu.Item>
          )}
        </div>
        <Description className={dialogStyles.description}>
          Open today’s log, revisit a past day, or update your medications.
        </Description>
      </div>
      <Separator
        role="separator"
        className={styles.introSeparator}
        data-navigation-intro-separator
      />
      <div className={styles.scrollArea} data-navigation-scroll>
        <Group aria-label="Journal pages" data-navigation-section="daily">
          <div className={styles.sectionHeading} aria-hidden="true">
            <span>Your Space</span>
            <span>{links.length} pages</span>
          </div>
          <div className={styles.entries}>
            {links.map(
              (
                { href, label, page, icon, description, tone, facts },
                index,
              ) => {
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
                    style={{ "--nav-order": index } as CSSProperties}
                    className={styles.entry}
                  >
                    <MenuRow
                      label={label}
                      description={description}
                      tone={tone}
                      active={active}
                      detail={summaries?.[page].detail}
                      facts={summaries?.[page].facts ?? facts}
                      icon={<ActionIcon name={icon} weight="fill" />}
                    />
                  </NavigationLink>
                );
              },
            )}
          </div>
        </Group>
        <Group data-navigation-section="resources" aria-label="Getting started">
          <div className={styles.sectionHeading} aria-hidden="true">
            <span>A Little Help</span>
            <span>At Your Pace</span>
          </div>
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
                label="Getting Started"
                description="Your first intake and daily check-ins."
                tone="sand"
                active={pathname === "/guide"}
                icon={<BookOpenText strokeWidth={2.1} />}
              />
            </NavigationLink>
          </div>
        </Group>
      </div>
      <div className={styles.footer} data-navigation-footer>
        <div className={styles.toolsHeading} aria-hidden="true">
          <span>Help &amp; Tools</span>
          <span>
            <strong>3</strong> Shortcuts
          </span>
        </div>
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
            <span className={styles.footerLinkLabel}>Backups</span>
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
            <span className={styles.footerLinkLabel}>Developer</span>
          </NavigationLink>
        </div>
        <p className={styles.footerCopy} data-navigation-footer-copy>
          Your place is remembered on this device. Come and go at your pace.
        </p>
      </div>
    </>
  );
  const triggerProps = {
    ref: triggerRef,
    "aria-label": "Open navigation",
    className: cn(
      "header-icon-button header-icon-button--compact header-brand-surface",
      controlStyles.headerButton,
      className,
    ),
    style: getBrandThemeStyle(),
    "data-navigation-trigger": "",
  };
  if (mobile)
    return (
      <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
        <DrawerTrigger
          {...triggerProps}
          render={<Button variant="ghost" size="icon" type="button" />}
        >
          <span className="header-control-surface" aria-hidden="true" />
          <NavigationMenuMark open={open} />
        </DrawerTrigger>
        <DrawerContent
          finalFocus={returnFocus}
          className={cn(styles.popup, styles.navigation, styles.mobileDialog)}
          data-navigation-menu
          data-navigation-layout="dialog"
        >
          <nav className={styles.navigationBody} aria-label="Main navigation">
            {contents}
          </nav>
        </DrawerContent>
      </Drawer>
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
