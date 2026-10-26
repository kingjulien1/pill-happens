import Link from "next/link";
import { ArrowLeft, Flower2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-sm flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-7 flex size-14 items-center justify-center rounded-[1.3rem] border border-border bg-card text-primary">
        <Flower2 className="size-6" strokeWidth={1.3} aria-hidden="true" />
      </div>
      <p className="eyebrow mb-4">A small detour</p>
      <h1 className="display text-4xl leading-tight">This page isn’t here.</h1>
      <p className="mt-4 max-w-64 text-sm leading-relaxed text-muted-foreground">
        Let’s head back to your daily journal.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to today
      </Link>
    </main>
  );
}
