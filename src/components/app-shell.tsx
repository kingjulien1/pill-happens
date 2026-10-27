"use client";

import { usePathname } from "next/navigation";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";
import { BrandNavigation } from "@/components/brand-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data, error, refresh } = useJournal();
  return (
    <div
      className={`mx-auto flex min-h-dvh max-w-[510px] flex-col px-6 pt-[max(25px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10 ${path === "/" ? "with-intake-dock" : ""}`}
    >
      <header
        className={`flex flex-col items-center ${path === "/" ? "mb-10 sm:mb-12" : "mb-8"}`}
      >
        <nav aria-label="Main navigation">
          <BrandNavigation />
        </nav>
      </header>
      <main id="main" className="flex min-w-0 flex-1 flex-col">
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
            className="flex min-h-64 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Opening your space…
          </div>
        ) : (
          <div
            key={path}
            className={`page-enter min-w-0 flex-1 ${path === "/" ? "flex flex-col" : ""}`}
          >
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
