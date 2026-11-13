"use client";

import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { HeadingText } from "@/components/heading-text";
import { BrandMark } from "@/components/brand";
import { getBrandThemeStyle } from "@/lib/action-button-system";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          title="Something Went Wrong"
          context="Please Try Again"
          className="justify-center"
        />
      </h1>
      <p className="mt-2 max-w-64 text-sm leading-relaxed text-canvas-muted-foreground">
        Something interrupted this page. Try loading it again.
      </p>
      <Button onClick={reset} className="mt-6 h-12 gap-2.5 rounded-xl px-6">
        <ActionIcon name="retry" />
        Try again
      </Button>
      <Link
        href="/"
        className="mt-3 inline-flex min-h-11 items-center px-4 text-sm text-canvas-muted-foreground underline-offset-4 hover:text-canvas-foreground hover:underline"
      >
        Back to today
      </Link>
    </main>
  );
}
