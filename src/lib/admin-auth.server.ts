import "server-only";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "./api-config";
import { isAdminSession } from "./admin-auth";

export async function hasServerAdminSession(): Promise<boolean> {
  const jar = await cookies();
  if (
    !jar.has("better-auth.session_token") &&
    !jar.has("__Secure-better-auth.session_token")
  )
    return false;
  const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
    headers: { Cookie: jar.toString() },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error("Authentication service unavailable");
  return isAdminSession(await response.json());
}
