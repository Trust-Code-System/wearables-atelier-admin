"use client";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { clearLegacyPaymentKeys } from "@/lib/admin-operations";
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      clearLegacyPaymentKeys(window.localStorage);
    } catch {
      /* Never read or display legacy payment keys, including malformed storage. */
    }
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
