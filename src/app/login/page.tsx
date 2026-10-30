import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { HeadingText } from "@/components/heading-text";
import { Brand } from "@/components/brand";
import { InstallAppButton } from "@/components/install-app-button";
import { configurationIssue, isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Your Private Space" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const needsSetup = Boolean(configurationIssue());
  if (!needsSetup && (await isAuthenticated())) redirect("/");

  return (
    <main className="page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-14 sm:px-8">
      <div className="mb-28 flex justify-center sm:mb-32">
        <Brand />
      </div>
      <header className="canvas-copy mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          <HeadingText
            title="Sign In"
            context="Private Journal"
            className="justify-center"
          />
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Open the journal linked to your password.
        </p>
      </header>
      <section
        className="surface rounded-3xl p-6 sm:p-7"
        aria-label={needsSetup ? "Setup needed" : "Sign in"}
      >
        {needsSetup ? (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-accent text-foreground">
              <LockKeyhole
                className="size-5"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <h2 className="text-sm font-medium">
              Your Private Space Needs a Little Setup.
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
      <p className="mt-6 text-center text-xs text-canvas-muted-foreground">
        One day at a time.
      </p>
      <div className="mx-auto mt-2 flex w-fit justify-center rounded-xl bg-surface-reading">
        <InstallAppButton />
      </div>
    </main>
  );
}
