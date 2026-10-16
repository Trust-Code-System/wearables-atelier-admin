/** Shared role check: keep aligned with the backend's current admin policy. */
export function isAdminSession(value: unknown): boolean {
  if (
    !value ||
    typeof value !== "object" ||
    !("user" in value) ||
    !("session" in value)
  )
    return false;
  const user = value.user;
  const session = value.session;
  return Boolean(
    user &&
    typeof user === "object" &&
    "role" in user &&
    (user.role === "admin" ||
      (user.role === "owner" &&
        "emailVerified" in user &&
        user.emailVerified === true)) &&
    session &&
    typeof session === "object" &&
    "expiresAt" in session &&
    typeof session.expiresAt === "string" &&
    new Date(session.expiresAt).getTime() > Date.now(),
  );
}
export function safeAdminNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/admin") || value.includes("\\"))
    return "/admin";
  try {
    const url = new URL(value, "https://admin.example.test");
    if (
      url.origin !== "https://admin.example.test" ||
      !(url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
    )
      return "/admin";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/admin";
  }
}
