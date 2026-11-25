"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type RefObject,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import {
  BookOpenText,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
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
import closeStyles from "./dialog-close.module.css";
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

const library = [
  {
    href: "/journal",
    page: "journal",
    label: "Journal",
    icon: "record",
    hint: "Writing & reflections",
  },
  {
    href: "/history",
    page: "history",
    label: "Past Days",
    icon: "navHistory",
    hint: "Daily timelines",
  },
  {
    href: "/medications",
    page: "medications",
    label: "Medications",
    icon: "navMedications",
    hint: "Strengths & forms",
  },
  {
    href: "/goals",
    page: "goals",
    label: "Goals",
    icon: "navGoals",
    hint: "Your daily limits",
  },
] as const;

function countCaption(
  value: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${value.toLocaleString("en")} ${value === 1 ? singular : plural}`;
}

const desktopQuery = "(min-width: 768px)";
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;
const atBackupSection = () => window.location.hash === "#history";
function subscribeToGuideHash(notify: () => void) {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
}

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

function NavigationContents({
  mobile,
  pathname,
  followLink,
}: {
  mobile: boolean;
  pathname: string;
  followLink: () => void;
}) {
  const { data, now } = useJournal();
  const workspace = useJournalWorkspace();
  const backups = useSyncExternalStore(
    subscribeToGuideHash,
    atBackupSection,
    serverSnapshot,
  );
  const today = data && now ? dayKey(now, data.settings.timezone) : null;
  const summaries = useMemo(() => {
    if (!data || !today) return null;
    const active = data.medications.filter(
      (medication) => !medication.archived,
    );
    const history = journalDays(
      data.intakes,
      data.dailyCheckIns,
      data.settings.timezone,
    ).filter((day) => day < today);
    const pages = journalLibraryEntries(data.dailyCheckIns);
    const words = pages.reduce((sum, entry) => sum + entry.words, 0);
    const archived = data.medications.length - active.length;
    const activeIds = new Set(active.map((medication) => medication.id));
    const upcoming = data.goals.filter(
      (goal) => goal.startsOn > today && activeIds.has(goal.medicationId),
    ).length;
    const checkIns = (["morning", "evening"] as const).filter((period) =>
      checkInForDay(data.dailyCheckIns, today, period),
    ).length;
    return {
      intakes: dayIntakes(data, today).length,
      checkIns,
      journal: {
        count: countCaption(pages.length, "page"),
        detail: countCaption(words, "word"),
      },
      history: {
        count: countCaption(history.length, "day"),
        detail:
          history[0] &&
          `Last ${formatDay(history[0], { weekday: undefined, month: "short" })}`,
      },
      medications: {
        count: `${active.length} active`,
        detail: `${archived} archived`,
      },
      goals: {
        count: countCaption(
          active.filter((medication) => goalForDay(data, medication.id, today))
            .length,
          "active goal",
        ),
        detail: `${upcoming} upcoming`,
      },
    };
  }, [data, today]);
  const Title = mobile ? DrawerTitle : "p";
  const Description = mobile ? DrawerDescription : "p";
  const Group = mobile ? "section" : Menu.Group;
  return (
    <>
      <div className={styles.masthead} data-navigation-masthead>
        <div>
          <span className={styles.wordmark}>
            <BrandMark />
            Pill Happens
          </span>
          <Title className={styles.title}>Journal index</Title>
        </div>
        <Description className="sr-only">
          Open today’s log, browse journal pages, or find help.
        </Description>
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
      </div>
      <div className={styles.scrollArea} data-navigation-scroll>
        <Group aria-label="Journal library" data-navigation-section="daily">
          <div className={styles.sectionLabel} aria-hidden="true">
            Library
          </div>
          <div className={styles.directory}>
            <NavigationLink
              mobile={mobile}
              href="/"
              label="Today"
              onFollow={followLink}
              aria-current={pathname === "/" ? "page" : undefined}
              className={styles.today}
              data-navigation-link
              data-page="today"
              data-active={pathname === "/"}
            >
              <span className={styles.dateLeaf} aria-hidden="true">
                {today ? (
                  <>
                    <span>
                      {formatDay(today, {
                        weekday: undefined,
                        month: "short",
                        day: undefined,
                      })}
                    </span>
                    <strong>{Number(today.slice(-2))}</strong>
                  </>
                ) : (
                  <CalendarDays />
                )}
              </span>
              <span className={styles.rowCopy}>
                <span className={styles.todayTitle}>
                  <strong>Today</strong>
                  {today && (
                    <time dateTime={today} aria-label={formatDay(today)}>
                      {formatDay(today, { month: undefined, day: undefined })}
                    </time>
                  )}
                </span>
                <span className={styles.entryDetail}>
                  <span>
                    {summaries
                      ? countCaption(summaries.intakes, "intake")
                      : "Intakes"}
                  </span>
                  <span>
                    {summaries
                      ? `${summaries.checkIns}/2 check-ins`
                      : "Daily check-ins"}
                  </span>
                </span>
              </span>
              <span className={styles.todayArrow} aria-hidden="true">
                {pathname === "/" ? <CircleCheck /> : <ArrowRight />}
              </span>
            </NavigationLink>
            {library.map(({ href, label, page, icon, hint }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              const summary = summaries?.[page];
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
                  <span className={styles.tabIcon} aria-hidden="true">
                    <ActionIcon name={icon} weight="duotone" />
                  </span>
                  <span className={styles.rowCopy}>
                    <strong>{label}</strong>
                    <span className={styles.entryDetail}>
                      <span>{summary?.count ?? hint}</span>
                      {summary?.detail && <span>{summary.detail}</span>}
                    </span>
                  </span>
                  {active ? (
                    <CircleCheck
                      aria-hidden="true"
                      className={styles.direction}
                    />
                  ) : (
                    <ArrowUpRight
                      aria-hidden="true"
                      className={styles.direction}
                    />
                  )}
                </NavigationLink>
              );
            })}
          </div>
        </Group>
        <Group
          aria-label="Help and tools"
          data-navigation-section="resources"
          data-navigation-footer
        >
          <div className={styles.sectionLabel} aria-hidden="true">
            Help &amp; tools
          </div>
          <div className={styles.tools} data-navigation-footer-links>
            <NavigationLink
              mobile={mobile}
              href="/guide#start"
              prefetch={false}
              label="Getting Started Guide"
              onFollow={followLink}
              aria-current={
                pathname === "/guide" && !backups ? "page" : undefined
              }
              data-page="guide"
              data-navigation-link
              className={styles.footerLink}
            >
              <BookOpenText aria-hidden="true" />
              <span>Getting started</span>
            </NavigationLink>
            <NavigationLink
              mobile={mobile}
              href="/guide#history"
              prefetch={false}
              label="Backups and Export"
              aria-label="Read about backups and export"
              aria-current={
                pathname === "/guide" && backups ? "location" : undefined
              }
              title="Backups & Export"
              onFollow={followLink}
              className={styles.footerLink}
              data-navigation-backups
            >
              <CloudDownload aria-hidden="true" strokeWidth={2} />
              <span>Backups &amp; export</span>
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
              <span>Report a bug</span>
              <ArrowUpRight className={styles.external} aria-hidden="true" />
            </NavigationLink>
            <NavigationLink
              mobile={mobile}
              href="/developer-guide"
              prefetch={false}
              label="Developer Guide"
              aria-label="Developer Guide"
              title="Developer Guide"
              onFollow={followLink}
              aria-current={
                pathname === "/developer-guide" ? "page" : undefined
              }
              className={styles.footerLink}
              data-navigation-developer-guide
            >
              <Braces aria-hidden="true" strokeWidth={2} />
              <span>Developer guide</span>
            </NavigationLink>
          </div>
        </Group>
      </div>
    </>
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
  const contents = (
    <NavigationContents
      mobile={mobile}
      pathname={pathname}
      followLink={followLink}
    />
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
