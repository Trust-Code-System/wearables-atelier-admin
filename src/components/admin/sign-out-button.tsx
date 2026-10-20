"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/catalog-api";
import { DashboardButton } from "@/components/block/dashboard-shell";
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="secondary"
      size="icon"
      aria-label="Sign out"
      title="Sign out"
      disabled={busy}
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await api("/api/admin-auth/sign-out", { method: "POST", body: "{}" });
          router.replace("/login");
          router.refresh();
        } catch {
          toast.error("Could not sign out. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <LogOutIcon aria-hidden />
    </DashboardButton>
  );
}
