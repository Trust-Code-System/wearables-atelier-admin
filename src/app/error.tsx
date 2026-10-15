"use client";
import { Button } from "@/components/ui/button";
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl">Unable to load this page</h1>
      <p className="text-sm text-muted-foreground">
        Please try again. If this continues, check that the backend is
        available.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
