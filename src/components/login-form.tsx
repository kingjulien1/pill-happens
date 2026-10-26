"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const password = new FormData(event.currentTarget).get("password");
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not sign in. Please try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      <div className="form-field">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          maxLength={1024}
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          className="h-12 rounded-lg bg-background px-3 text-base md:text-base"
        />
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
        disabled={pending}
        className="h-12 w-full gap-2 rounded-lg text-sm"
      >
        {pending ? (
          <>
            <ActionIcon name="loading" className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ActionIcon name="next" />
          </>
        )}
      </Button>
    </form>
  );
}
