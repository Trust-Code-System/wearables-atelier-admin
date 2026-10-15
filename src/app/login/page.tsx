import { redirect } from "next/navigation";
import { hasServerAdminSession } from "@/lib/admin-auth.server";
import { safeAdminNext } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";
export const metadata = { title: "Sign in" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const next = safeAdminNext(params.next);
  let signedIn: boolean;
  try {
    signedIn = await hasServerAdminSession();
  } catch {
    return (
      <LoginForm
        next={next}
        initialError="Authentication service unavailable. Please try again."
      />
    );
  }
  if (signedIn) redirect(next);
  return (
    <LoginForm
      next={next}
      initialError={
        params.reason === "forbidden"
          ? "Your account does not have administrator access."
          : ""
      }
    />
  );
}
