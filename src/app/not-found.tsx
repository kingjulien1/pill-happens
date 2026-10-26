import Link from "next/link";
import { ArrowLeft, Flower2 } from "lucide-react";
import { HeadingText } from "@/components/heading-text";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-sm flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-[1.3rem] border border-border bg-card text-primary">
        <Flower2 className="size-6" strokeWidth={1.3} aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        <HeadingText
          title="Page not found"
          context="404"
          className="justify-center"
        />
      </h1>
      <p className="mt-2 max-w-64 text-sm leading-relaxed text-muted-foreground">
        Let’s head back to your daily journal.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to today
      </Link>
    </main>
  );
}
