"use client";

import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { HeadingText } from "@/components/heading-text";
import { BrandMark } from "@/components/brand";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-6 py-10">
      <section className="surface rounded-xl p-5">
        <div className="mb-4 flex size-9 items-center justify-center rounded-lg border border-border text-primary">
          <BrandMark />
        </div>
        <h1 className="text-lg leading-6 font-semibold tracking-tight">
          <HeadingText title="Page error" context="Try again" />
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Something interrupted this page. Try loading it again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={reset} className="h-11 gap-2 rounded-lg px-4">
            <ActionIcon name="retry" />
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to today
          </Link>
        </div>
      </section>
    </main>
  );
}
