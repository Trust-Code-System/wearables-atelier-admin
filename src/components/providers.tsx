"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { CatalogProvider, CurrencyProvider, OrdersProvider, SettingsProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CurrencyProvider>
        <CatalogProvider>
          <OrdersProvider>
            <SettingsProvider>{children}</SettingsProvider>
          </OrdersProvider>
        </CatalogProvider>
      </CurrencyProvider>
    </MotionConfig>
  );
}
