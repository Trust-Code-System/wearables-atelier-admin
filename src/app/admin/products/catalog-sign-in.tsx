"use client";

import { useState } from "react";
import { api } from "@/lib/catalog-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Uses existing Better Auth accounts; account/role provisioning stays server-owned. */
export function CatalogSignIn({ onSuccess }: { onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email")),
          password: String(data.get("password")),
        }),
      });
      form.reset();
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-sm space-y-3 rounded border p-4">
      <h2>Administrator sign-in</h2>
      <label className="block">
        Email
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={busy}
        />
      </label>
      <label className="block">
        Password
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
