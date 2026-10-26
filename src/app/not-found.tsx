import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { HeadingText } from "@/components/heading-text";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-6 py-10">
      <section className="surface rounded-xl p-5">
        <div className="mb-4 flex size-9 items-center justify-center rounded-lg border border-border text-primary">
          <BrandMark />
        </div>
        <h1 className="text-lg leading-6 font-semibold tracking-tight">
          <HeadingText title="Page not found" context="404" />
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Let’s head back to your daily journal.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <ActionIcon name="back" />
          Back to today
        </Link>
      </section>
    </main>
  );
}
