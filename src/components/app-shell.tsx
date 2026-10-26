"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  History,
  Pill,
  Target,
  Flower2,
  ArrowUpRight,
  LoaderCircle,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto flex min-h-dvh max-w-[510px] flex-col px-6 pt-[max(25px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10">
      <header className="mb-10 flex flex-col items-center">
        <Link
          href="/"
          className="mb-7 flex items-center gap-2.5"
          aria-label="Pill happens home"
        >
          <span className="flex size-8 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary">
            <Flower2 size={17} strokeWidth={1.5} />
          </span>
          <span className="text-[15px] font-medium tracking-[-.03em]">
            pill happens<span className="ml-0.5 text-primary">.</span>
          </span>
        </Link>
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
      <footer className="mt-12 border-t border-border/70 pt-6 text-center">
        <p className="display text-[18px] italic tracking-[-.02em] text-muted-foreground">
          A little awareness. One day at a time.
        </p>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Work with your prescriber before changing your dose.
          <br />
          Reducing too quickly or stopping suddenly can cause dangerous
          withdrawal.
        </p>
        <a
          href="https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground underline decoration-border underline-offset-4"
        >
          About safe withdrawal <ArrowUpRight size={10} />
        </a>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[9px] tracking-[.1em] text-muted-foreground/75">
          <LockKeyhole size={10} />
          YOUR PRIVATE SPACE
        </div>
      </footer>
    </div>
  );
}
