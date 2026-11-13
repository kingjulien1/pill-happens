import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { HeadingText } from "@/components/heading-text";
import { BrandMark } from "@/components/brand";
import { FilledActionSurface } from "@/components/ui/button";
import {
  getBrandThemeStyle,
  getButtonThemeStyle,
} from "@/lib/action-button-system";
import actionStyles from "@/components/action-button.module.css";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-sm flex-col items-center justify-center px-6 py-14 text-center">
      <div
        className="mb-5 flex size-14 items-center justify-center rounded-[1.3rem] border"
        data-brand-icon-surface
        style={{
          ...getBrandThemeStyle(),
          backgroundColor: "var(--brand-surface)",
          color: "var(--brand-copy)",
          borderColor: "color-mix(in srgb, var(--brand-copy) 67%, transparent)",
        }}
      >
        <BrandMark className="size-6" />
      </div>
      <h1 className="canvas-copy text-2xl font-semibold tracking-tight">
        <HeadingText
          title="Page Not Found"
          context="404"
          className="justify-center"
        />
      </h1>
      <p className="mt-2 max-w-64 text-sm leading-relaxed text-canvas-muted-foreground">
        Let’s head back to your daily journal.
      </p>
      <Link
        href="/"
        data-slot="button"
        data-filled-action
        style={getButtonThemeStyle("primary")}
        className={`mt-6 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-medium transition-colors ${actionStyles.filled}`}
      >
        <FilledActionSurface />
        <ActionIcon name="back" />
        Back to today
      </Link>
    </main>
  );
}
