"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Shared view state between the admin shell toolbar and pages */
const AdminViewContext = createContext<{
  tab: string;
  setTab: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
} | null>(null);

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("newest");
  const value = useMemo(() => ({ tab, setTab, sort, setSort }), [tab, sort]);
  return <AdminViewContext.Provider value={value}>{children}</AdminViewContext.Provider>;
}

export function useAdminView() {
  const ctx = useContext(AdminViewContext);
  if (!ctx) throw new Error("useAdminView must be used within AdminViewProvider");
  return ctx;
}
