"use client";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { clearLegacyPaymentKeys } from "@/lib/admin-operations";
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      clearLegacyPaymentKeys(window.localStorage);
    } catch {
      /* Never read or display legacy payment keys, including malformed storage. */
    }
  }, []);
  return (
    <ThemeProvider
      attribute="class"
      storageKey="wearables-admin-theme"
      defaultTheme="light"
      enableSystem={false}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
