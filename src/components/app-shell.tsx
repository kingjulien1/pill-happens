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
      className={`mx-auto flex min-h-dvh max-w-[510px] flex-col px-6 pt-[max(25px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10 ${path === "/" ? "with-intake-dock" : ""}`}
    >
      <header className="mb-8 flex flex-col items-center">
        <Brand className="mb-5" />
        <nav
          aria-label="Main navigation"
          className="surface flex gap-1 rounded-2xl p-1.5"
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
              className="nav-link"
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
          <div role="alert" className="surface rounded-3xl p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-5 h-11 px-5"
              onClick={() => void refresh()}
            >
              <ActionIcon name="retry" className="mr-2" />
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div
            role="status"
            className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Opening your space…
          </div>
        ) : (
          <div key={path} className="page-enter">
            {children}
          </div>
        )}
      </main>
      <footer className="mt-6 flex min-h-8 items-center justify-center gap-2 text-[10px] leading-4 text-muted-foreground">
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
