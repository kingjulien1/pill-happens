"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";

const links = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/history", label: "Past days", icon: "history" },
  { href: "/medications", label: "Medications", icon: "medications" },
  { href: "/goals", label: "Goals", icon: "goals" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, error, refresh } = useJournal();
  return (
    <div
      className={`mx-auto flex min-h-dvh max-w-[510px] flex-col px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8 sm:pt-6 ${path === "/" ? "with-intake-dock" : ""}`}
    >
      <header className="mb-6 flex flex-col items-center gap-3">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="grid w-full grid-cols-4 gap-1 border-b border-border pb-3"
        >
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={
                (href === "/" ? path === href : path.startsWith(href))
                  ? "page"
                  : undefined
              }
              data-active={href === "/" ? path === href : path.startsWith(href)}
              className="nav-link w-full rounded-lg"
            >
              <ActionIcon
                name={icon}
                className="size-6"
                weight={
                  (href === "/" ? path === href : path.startsWith(href))
                    ? "fill"
                    : "bold"
                }
              />
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" className="flex-1">
        {error ? (
          <div role="alert" className="surface rounded-xl p-5">
            <p className="text-sm leading-6 text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-4 h-11 gap-2 rounded-lg px-4"
              onClick={() => void refresh()}
            >
              <ActionIcon name="retry" />
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div
            role="status"
            className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Loading journal…
          </div>
        ) : (
          <div key={path} className="page-enter">
            {children}
          </div>
        )}
      </main>
      <footer className="mt-5 flex min-h-8 items-center justify-center gap-2 text-[10px] leading-4 text-muted-foreground">
        <span className="whitespace-nowrap">One day at a time.</span>
        <span aria-hidden="true" className="text-muted-foreground/60">
          ·
        </span>
        <a
          href="https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class"
          target="_blank"
          rel="noreferrer"
          aria-label="Safety guidance on benzodiazepine withdrawal (opens in a new tab)"
          className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-md transition-colors hover:text-foreground"
        >
          Safety guidance <ActionIcon name="external" className="size-3.5" />
        </a>
      </footer>
    </div>
  );
}
