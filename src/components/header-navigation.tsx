"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { BookOpenText, ArrowUpRight, CircleCheck, X } from "lucide-react";
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

export function HeaderNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <NavigationMenu key={pathname} pathname={pathname} className={className} />
  );
}

function NavigationMenu({
  pathname,
  className,
}: {
  pathname: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
      <Menu.Trigger
        aria-label="Open navigation"
        className={cn(
          "header-icon-button header-icon-button--compact header-brand-surface",
          className,
        )}
        style={getBrandThemeStyle()}
        data-navigation-trigger
      >
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
          >
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
                <p className={styles.title}>Your Journal</p>
                <p className={styles.subtitle}>Your daily launchpad.</p>
              </div>
              <div
                className={styles.headerActions}
                role="group"
                aria-label="Navigation controls"
                data-navigation-header-actions
              >
                <AppearanceMenu />
                <Menu.Item
                  render={<button type="button" />}
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
              </div>
            </div>
            <Menu.Separator
              className={styles.introSeparator}
              data-navigation-intro-separator
            />
            <div className={styles.scrollArea} data-navigation-scroll>
              <Menu.Group
                aria-label="Journal pages"
                data-navigation-section="daily"
              >
                <div className={styles.entries}>
                  {links.map(
                    ({ href, label, page, icon, description, tone }) => {
                      const active =
                        pathname === href ||
                        (href !== "/" && pathname.startsWith(`${href}/`));

                      return (
                        <Menu.LinkItem
                          key={href}
                          render={
                            <Link
                              href={href}
                              onNavigate={
                                page === "journal"
                                  ? () => workspace.rememberDestination(href)
                                  : undefined
                              }
                            />
                          }
                          label={label}
                          closeOnClick
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
                        </Menu.LinkItem>
                      );
                    },
                  )}
                </div>
              </Menu.Group>
              <Menu.Group
                data-navigation-section="resources"
                aria-label="Getting started"
              >
                <div className={styles.entries}>
                  <Menu.LinkItem
                    render={<Link href="/guide#start" prefetch={false} />}
                    label="Getting Started Guide"
                    closeOnClick
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
                  </Menu.LinkItem>
                </div>
              </Menu.Group>
            </div>
            <div className={styles.footer} data-navigation-footer>
              <div className={styles.footerNote} data-navigation-footer-links>
                <Menu.LinkItem
                  render={<Link href="/guide#history" prefetch={false} />}
                  label="Backups and Export"
                  aria-label="Read about backups and export"
                  title="Backups & Export"
                  closeOnClick
                  className={styles.footerLink}
                  data-navigation-backups
                >
                  <span className={styles.footerLinkLabel}>
                    Backups &amp; Export
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </Menu.LinkItem>
                <Menu.LinkItem
                  render={
                    <a
                      href="https://github.com/kingjulien1/pill-happens/issues/new?template=bug_report.yml"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  label="Report a Bug"
                  aria-label="Report a Bug"
                  title="Report a Bug"
                  closeOnClick
                  className={styles.footerLink}
                  data-navigation-report-bug
                >
                  <span className={styles.footerLinkLabel}>Report a Bug</span>
                  <ArrowUpRight aria-hidden="true" />
                </Menu.LinkItem>
                <Menu.LinkItem
                  render={<Link href="/developer-guide" prefetch={false} />}
                  label="Developer Guide"
                  aria-label="Developer Guide"
                  title="Developer Guide"
                  closeOnClick
                  aria-current={
                    pathname === "/developer-guide" ? "page" : undefined
                  }
                  className={styles.footerLink}
                  data-navigation-developer-guide
                >
                  <span className={styles.footerLinkLabel}>
                    Developer Guide
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </Menu.LinkItem>
              </div>
              <p className={styles.footerCopy} data-navigation-footer-copy>
                You can wander without losing your place. Past Days takes you
                back to earlier entries, while Backups &amp; Export explains how
                to keep a copy of your journal. The Developer Guide opens the
                workshop, with design notes, setup steps and the code behind the
                app. If a button misbehaves or something feels off, Report a Bug
                opens the project’s bug form. Share what happened, what you
                expected and a simple way to reproduce it; a useful little clue
                can make the next fix much easier.
              </p>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
