"use client";

import Link from "next/link";
import { Flower2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-sm flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-7 flex size-14 items-center justify-center rounded-[1.3rem] border border-border bg-card text-primary">
        <Flower2 className="size-6" strokeWidth={1.3} aria-hidden="true" />
      </div>
      <p className="eyebrow mb-4">A moment to pause</p>
      <h1 className="display text-4xl leading-tight">Let’s take a breath.</h1>
      <p className="mt-4 max-w-64 text-sm leading-relaxed text-muted-foreground">
        Something interrupted this page. Try loading it again.
      </p>
      <Button onClick={reset} className="mt-8 h-12 gap-2.5 rounded-xl px-6">
        <RotateCcw className="size-4" aria-hidden="true" />
        Try again
      </Button>
      <Link
        href="/"
        className="mt-3 inline-flex min-h-11 items-center px-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to today
      </Link>
    </main>
  );
}
