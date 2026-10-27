import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { HeadingText } from "@/components/heading-text";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="page-enter mx-auto flex min-h-[80dvh] max-w-sm flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-[1.3rem] border border-border bg-card text-foreground">
        <BrandMark className="size-6" />
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
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-action-background px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-action-background/90"
      >
        <ActionIcon name="back" />
        Back to today
      </Link>
    </main>
  );
}
