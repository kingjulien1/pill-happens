import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionIcon } from "@/components/action-icon";
import { LoginForm } from "@/components/login-form";
import { HeadingText } from "@/components/heading-text";
import { Brand } from "@/components/brand";
import { configurationIssue, isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Your private space" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const needsSetup = Boolean(configurationIssue());
  if (!needsSetup && (await isAuthenticated())) redirect("/");

  return (
    <main className="page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-8 sm:px-8">
      <div className="mb-5 flex justify-center">
        <Brand />
      </div>
      <section
        className="surface rounded-xl p-5"
        aria-label={needsSetup ? "Setup needed" : "Sign in"}
      >
        <header className="mb-5 border-b border-border pb-4">
          <h1 className="text-lg leading-6 font-semibold tracking-tight">
            <HeadingText
              title={needsSetup ? "Setup" : "Sign in"}
              context="Journal"
              trailing="Private"
            />
          </h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Sign in to keep track of your day.
          </p>
        </header>
        {needsSetup ? (
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ActionIcon name="secure" />
              <h2 className="text-sm leading-5 font-semibold">
                Your journal needs a little setup.
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Finish the environment configuration in the project README, then
              come back here.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </section>
      <p className="mt-5 text-center text-[10px] text-muted-foreground">
        One day at a time.
      </p>
    </main>
  );
}
