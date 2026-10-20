"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/catalog-api";
import { isAdminSession, safeAdminNext } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  next,
  initialError = "",
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("/api/admin-auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email")).trim(),
          password: String(data.get("password")),
        }),
      });
      const session = await api<unknown>("/api/admin-auth/get-session");
      if (!isAdminSession(session))
        throw new Error(
          "This account does not have administrator access. Sign in with an administrator account.",
        );
      form.reset();
      router.replace(safeAdminNext(next));
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "Email or password is incorrect."
          : cause instanceof Error
            ? cause.message
            : "Sign-in failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <Image
          src="/brand/wearables-by-ashabi.png"
          alt="Wearables by Ashabi"
          width={180}
          height={75}
          className="mx-auto h-auto"
          priority
        />
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl">Admin sign-in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage the store.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
