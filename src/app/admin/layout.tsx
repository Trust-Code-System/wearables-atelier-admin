import { headers } from "next/headers";
import { safeAdminNext } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { hasServerAdminSession } from "@/lib/admin-auth.server";
import { AdminSessionGuard } from "@/components/admin/admin-session-guard";
import AdminShellLayout from "./admin-shell";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasServerAdminSession())) {
    const next = safeAdminNext((await headers()).get("x-wearables-admin-next"));
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return (
    <AdminSessionGuard>
      <AdminShellLayout>{children}</AdminShellLayout>
    </AdminSessionGuard>
  );
}
