import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flower2, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { configurationIssue, isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Your private space" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const needsSetup = Boolean(configurationIssue());
  if (!needsSetup && (await isAuthenticated())) redirect("/");

  return (
    <main className="page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-14 sm:px-8">
      <div className="mb-12 flex items-center justify-center gap-2.5 text-primary">
        <Flower2 className="size-5" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-sm font-medium tracking-tight">Pill happens</span>
      </div>
      <header className="mb-8 text-center">
        <p className="eyebrow mb-4">One day at a time</p>
        <h1 className="display text-[2.8rem] leading-[1.12]">
          A little space,
          <br />
          just for you.
        </h1>
        <p className="mx-auto mt-4 max-w-64 text-sm leading-relaxed text-muted-foreground">
          Keep track, find your rhythm,
          <br />
          and take things at your own pace.
        </p>
      </header>
      <section
        className="surface rounded-3xl p-6 sm:p-7"
        aria-label={needsSetup ? "Setup needed" : "Sign in"}
      >
        {needsSetup ? (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <LockKeyhole
                className="size-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <h2 className="text-sm font-medium">
              Your private space needs a little setup.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Finish the environment configuration in the project README, then
              come back here.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </section>
      <p className="mt-10 text-center text-xs tracking-wide text-muted-foreground">
        Small steps. A little more clarity.
      </p>
    </main>
  );
}
