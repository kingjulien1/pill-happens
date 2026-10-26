"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  History,
  Pill,
  Target,
  ArrowUpRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";

const links = [
  { href: "/", label: "Today", Icon: House },
  { href: "/history", label: "Past days", Icon: History },
  { href: "/medications", label: "Medications", Icon: Pill },
  { href: "/goals", label: "Goals", Icon: Target },
];

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
          {links.map(({ href, label, Icon }) => (
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
              <Icon size={18} strokeWidth={1.65} />
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
              <RefreshCw className="mr-2" />
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div
            role="status"
            className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <LoaderCircle className="size-4 animate-spin" />
            Opening your space…
          </div>
        ) : (
          <div key={path} className="page-enter">
            {children}
          </div>
        )}
      </main>
      <footer className="mt-6 flex min-h-8 items-center justify-center gap-2 text-[10px] leading-4 text-muted-foreground">
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
          Safety guidance <ArrowUpRight size={10} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
