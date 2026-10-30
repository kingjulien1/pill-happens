"use client";

import { usePathname } from "next/navigation";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { Button } from "@/components/ui/button";
import { PullToRefreshBrand } from "@/components/page-refresh";
import { HeaderNavigation } from "@/components/header-navigation";
import { StreakMenu } from "@/components/streak-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const intakePage = path === "/" || path.startsWith("/history/");
  const { data, error, refresh } = useJournal();
  return (
    <div
      className={`mx-auto flex min-h-dvh max-w-[510px] flex-col px-6 pt-[max(25px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10 ${path === "/" ? "with-intake-dock" : ""}`}
    >
      <header className="mb-28 grid h-11 w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:mb-32">
        <nav
          aria-label="Main navigation"
          className="flex size-11 items-center justify-center"
        >
          <HeaderNavigation />
        </nav>
        <PullToRefreshBrand />
        <StreakMenu />
      </header>
      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {error && (
          <div
            role="alert"
            className={
              data
                ? "surface mb-4 flex items-center gap-3 rounded-2xl px-4 py-3"
                : "surface rounded-3xl p-8 text-center"
            }
          >
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className={
                data
                  ? "h-10 shrink-0 gap-2 px-3 text-xs"
                  : "mt-5 h-11 gap-2 px-5"
              }
              onClick={() => void refresh()}
            >
              <ActionIcon name="retry" />
              Try again
            </Button>
          </div>
        )}
        {!data && !error && (
          <div
            role="status"
            className="flex min-h-64 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <ActionIcon name="loading" className="animate-spin" />
            Opening your space…
          </div>
        )}
        {data && (
          <div
            key={path}
            className={`min-w-0 flex-1 ${intakePage ? "" : "page-enter"} ${path === "/" ? "flex flex-col" : ""}`}
          >
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
