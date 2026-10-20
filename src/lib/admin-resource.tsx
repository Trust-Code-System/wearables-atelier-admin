"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAdminSession } from "@/components/admin/admin-session-guard";
import { api } from "./catalog-api";
import type { AdminReport } from "./admin-operations";
export function useAdminResource<T>(path: string | null) {
  const session = useAdminSession();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  const key =
    session.role === "owner" && path ? `${session.id}:${path}:${revision}` : "";
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!key || !path) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void api<T>(path, {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      })
        .then((data) => {
          if (!controller.signal.aborted) setResult({ key, data, error: "" });
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setResult({
              key,
              data: null,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Unable to load saved data.",
            });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, path]);
  useEffect(() => {
    window.addEventListener("wearables:admin-data-changed", refresh);
    return () =>
      window.removeEventListener("wearables:admin-data-changed", refresh);
  }, [refresh]);
  return {
    data: key && result?.key === key ? result.data : null,
    error: key && result?.key === key ? result.error : "",
    loading: Boolean(key) && result?.key !== key,
    refresh,
    owner: session.role === "owner",
  };
}
const ReportsContext = createContext<ReturnType<
  typeof useAdminResource<AdminReport>
> | null>(null);
export function AdminReportsProvider({ children }: { children: ReactNode }) {
  const report = useAdminResource<AdminReport>("/api/v1/admin/reports");
  return (
    <ReportsContext.Provider value={report}>{children}</ReportsContext.Provider>
  );
}
export function useAdminReport() {
  const value = useContext(ReportsContext);
  if (!value) throw new Error("AdminReportsProvider required");
  return value;
}
