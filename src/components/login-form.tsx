"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ActionIcon } from "@/components/action-icon";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recoverSession } from "@/lib/session-recovery";

type AuthResult = { ok?: boolean; needsCreation?: boolean; error?: string };

async function readResult(response: Response): Promise<AuthResult> {
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object") {
    throw new Error("We couldn’t read the server’s reply. Please try again.");
  }
  return result as AuthResult;
}

function errorMessage(result: AuthResult, fallback: string) {
  return typeof result.error === "string" && result.error
    ? result.error
    : fallback;
}

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"login" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidatePassword, setCandidatePassword] = useState<string | null>(
    null,
  );
  const [creationError, setCreationError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const recovery = useRef<AbortController | null>(null);
  const interacted = useRef(false);
  const busy = pending !== null;

  useEffect(() => {
    const restore = () => {
      if (
        interacted.current ||
        request.current ||
        recovery.current ||
        document.visibilityState === "hidden"
      )
        return;
      const controller = new AbortController();
      recovery.current = controller;
      void recoverSession({ signal: controller.signal })
        .then((session) => {
          if (
            session === "authenticated" &&
            !controller.signal.aborted &&
            !interacted.current
          )
            window.location.replace("/");
        })
        .catch(() => {
          // A cancelled or unavailable check leaves the sign-in form usable.
        })
        .finally(() => {
          if (recovery.current === controller) recovery.current = null;
        });
    };
    restore();
    window.addEventListener("online", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    document.addEventListener("visibilitychange", restore);
    return () => {
      request.current?.abort();
      recovery.current?.abort();
      recovery.current = null;
      window.removeEventListener("online", restore);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", restore);
      document.removeEventListener("visibilitychange", restore);
    };
  }, []);

  function stopRecovery() {
    interacted.current = true;
    recovery.current?.abort();
    recovery.current = null;
  }

  async function confirmSignIn(signal: AbortSignal) {
    const session = await recoverSession({ signal });
    if (session === "unauthenticated")
      throw new Error(
        "This browser didn’t keep your sign-in. Allow cookies, then open your journal with the same password.",
      );
    // A successful sign-in followed by a connection failure can still navigate;
    // the server will verify the cookie again before showing the journal.
    if (!signal.aborted) openJournal();
  }

  function openJournal() {
    setCandidatePassword(null);
    setCreationError(null);
    setPassword("");
    // A full navigation avoids reusing a pre-sign-in App Router response.
    window.location.replace("/");
  }

  function closeCreation() {
    // Once creation is submitted, keep its result visible until it finishes.
    if (request.current) return;
    setCandidatePassword(null);
    setCreationError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || candidatePassword !== null) return;
    stopRecovery();
    const submittedPassword = String(
      new FormData(event.currentTarget).get("password") ?? "",
    );
    if (submittedPassword.length < 4 || submittedPassword.length > 1024) {
      setError("Use a password between 4 and 1,024 characters.");
      return;
    }
    // Capture the submitted value, including spaces, independently of later input.
    setPassword(submittedPassword);
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setPending("login");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: submittedPassword }),
        signal: controller.signal,
      });
      const result = await readResult(response);
      if (controller.signal.aborted) return;
      if (!response.ok)
        throw new Error(
          errorMessage(
            result,
            "Could not open your journal. Please try again.",
          ),
        );
      if (result.needsCreation === true) {
        setCreationError(null);
        setCandidatePassword(submittedPassword);
        return;
      }
      if (result.ok !== true)
        throw new Error("We couldn’t confirm sign-in. Please try again.");
      await confirmSignIn(controller.signal);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof TypeError
          ? "We couldn’t connect. Check your connection and try again."
          : cause instanceof Error
            ? cause.message
            : "Could not open your journal. Please try again.",
      );
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setPending(null);
      }
    }
  }

  async function createJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || candidatePassword === null) return;
    stopRecovery();
    const submittedPassword = candidatePassword;
    const controller = new AbortController();
    request.current = controller;
    setCreationError(null);
    setPending("create");
    try {
      const response = await fetch("/api/journals", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: submittedPassword }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const result = await readResult(response);
      if (controller.signal.aborted) return;
      if (!response.ok || result.ok !== true)
        throw new Error(
          errorMessage(
            result,
            "Could not create your journal. Please try again.",
          ),
        );
      await confirmSignIn(controller.signal);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setCreationError(
        cause instanceof TypeError
          ? "We couldn’t confirm your request. Try again, or go back and sign in."
          : cause instanceof Error
            ? cause.message
            : "Could not create your journal. Please try again.",
      );
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setPending(null);
      }
    }
  }

  return (
    <>
      <form
        method="post"
        action="/api/login"
        onSubmit={submit}
        className="space-y-4"
        aria-busy={pending === "login"}
      >
        <div className="form-field">
          <Label htmlFor="password">Your Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your journal password"
            value={password}
            onChange={(event) => {
              stopRecovery();
              setPassword(event.target.value);
              setError(null);
            }}
            required
            minLength={4}
            maxLength={1024}
            disabled={busy || candidatePassword !== null}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "password-hint login-error" : "password-hint"
            }
            className="h-10 rounded-xl bg-background/40 px-3 text-base md:text-sm"
          />
          <p
            id="password-hint"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            At least 4 characters. Each password has its own journal.
          </p>
          {error && (
            <p
              id="login-error"
              role="alert"
              className="text-sm leading-relaxed text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={busy || candidatePassword !== null}
          className="h-12 w-full gap-3 rounded-xl text-sm"
        >
          {pending === "login" ? (
            <>
              <ActionIcon name="loading" className="animate-spin" />
              Opening your journal…
            </>
          ) : (
            <>
              Open journal
              <ActionIcon name="next" className="size-[22px]" />
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ActionIcon name="secure" className="size-4" />
          Your password opens your space.
        </p>
      </form>

      <ResponsiveModal
        open={candidatePassword !== null}
        onOpenChange={(open) => {
          if (!open) closeCreation();
        }}
        title="Create a New Journal?"
        context="New Space"
        description="This password isn’t linked to a journal yet."
      >
        {candidatePassword !== null && (
          <form
            method="post"
            action="/api/journals"
            onSubmit={createJournal}
            className="flex flex-col gap-5"
            aria-busy={pending === "create"}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-foreground">
                <ActionIcon name="log" weight="duotone" className="size-8" />
                <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-popover text-foreground">
                  <ActionIcon
                    name="sparkle"
                    weight="fill"
                    className="size-3.5"
                  />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">A Journal of Its Own</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Separate entries, medications, and goals.
                </p>
              </div>
            </div>

            <section
              aria-labelledby="new-journal-password-label"
              className="min-w-0 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 ring-4 ring-primary/5"
            >
              <div className="flex items-center justify-between gap-3 text-foreground">
                <p
                  id="new-journal-password-label"
                  className="text-[10px] font-semibold tracking-[.12em] uppercase"
                >
                  Your Journal Password
                </p>
                <ActionIcon name="secure" className="size-4" />
              </div>
              <pre
                tabIndex={0}
                role="region"
                aria-label="Your exact journal password"
                data-journal-password
                className="my-3 max-h-36 overflow-x-hidden overflow-y-auto rounded-lg font-mono text-[22px] leading-relaxed font-semibold break-all whitespace-break-spaces outline-offset-4 selection:bg-primary/20"
              >
                <code>{candidatePassword}</code>
              </pre>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Use this exact password to open this journal again.
              </p>
              {/^\s|\s$/u.test(candidatePassword) && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Spaces at the beginning and end are included.
                </p>
              )}
            </section>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Create an empty journal for this password. Your other journals
              stay separate.
            </p>
            {creationError && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs leading-relaxed text-destructive"
              >
                {creationError}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={busy}
                data-create-journal
                className="h-16 w-full gap-3 rounded-2xl text-base font-semibold"
              >
                <ActionIcon
                  name={pending === "create" ? "loading" : "confetti"}
                  weight="bold"
                  className={
                    pending === "create" ? "size-6 animate-spin" : "size-6"
                  }
                />
                {pending === "create"
                  ? "Creating your journal…"
                  : "Create journal"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={closeCreation}
                className="h-11 w-full gap-2 text-xs text-muted-foreground"
              >
                <ActionIcon name="back" className="size-4" />
                Back to sign in
              </Button>
            </div>
          </form>
        )}
      </ResponsiveModal>
    </>
  );
}
