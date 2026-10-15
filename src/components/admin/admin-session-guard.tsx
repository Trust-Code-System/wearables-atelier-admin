"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-config";
import { isAdminSession } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

export function AdminSessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let currentCheck = 0;
    const check = async () => {
      const checkId = ++currentCheck;
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(10000),
            ]),
          },
        );
        if (!response.ok && response.status !== 401 && response.status !== 403)
          throw new Error("Authentication service unavailable");
        const authorized = response.ok && isAdminSession(await response.json());
        if (controller.signal.aborted || checkId !== currentCheck) return;
        setVerifiedPath(authorized ? pathname : null);
        setError("");
        if (!authorized) {
          router.replace(
            `/login?next=${encodeURIComponent(pathname)}${response.status === 403 ? "&reason=forbidden" : ""}`,
          );
          router.refresh();
        }
      } catch {
        if (!controller.signal.aborted && checkId === currentCheck) {
          setVerifiedPath(null);
          setError("Unable to verify your session. Please try again.");
        }
      }
    };
    void check();
    const recheck = () => {
      void check();
    };
    window.addEventListener("focus", recheck);
    window.addEventListener("wearables:session-invalid", recheck);
    const timer = window.setInterval(recheck, 60000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("wearables:session-invalid", recheck);
    };
  }, [pathname, router, retry]);
  if (verifiedPath !== pathname)
    return (
      <div className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={() => setRetry((value) => value + 1)}>
              Retry session check
            </Button>
          </>
        ) : (
          <p role="status">Checking administrator session…</p>
        )}
      </div>
    );
  return children;
}
