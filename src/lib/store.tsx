"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Currency, Order, Product, StockAdjustment } from "@/lib/types";
import { validStock } from "@/lib/admin-data";
import { seedProducts, migrateBrandCatalog, legacyProductSlugIds } from "@/lib/products";

/* ------------------------------------------------------------------ */
/*  Store settings (admin → /admin/settings)                           */
/* ------------------------------------------------------------------ */

export interface StoreSettings {
  storeName: string;
  email: string;
  phone: string;
  address: string;
  defaultCurrency: Currency;
  paystackPublicKey: string;
  paystackSecretKey: string;
  paystackTestMode: boolean;
  freeShippingThresholdNGN: number;
  standardFeeNGN: number;
  expressFeeNGN: number;
}

export const defaultSettings: StoreSettings = {
  storeName: "Wearables Atelier",
  email: "hello@wearablesatelier.com",
  phone: "+234 906 729 2754",
  address: "D4 Shitta Road, Surulere, Lagos",
  defaultCurrency: "NGN",
  paystackPublicKey: "",
  paystackSecretKey: "",
  paystackTestMode: true,
  freeShippingThresholdNGN: 150_000,
  standardFeeNGN: 3_500,
  expressFeeNGN: 7_500,
};

const SettingsContext = createContext<{
  settings: StoreSettings;
  saveSettings: (patch: Partial<StoreSettings>) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = usePersistentState<StoreSettings>(
    "wa:settings",
    defaultSettings,
  );
  const saveSettings = useCallback(
    (patch: Partial<StoreSettings>) =>
      setSettings((prev) => ({ ...prev, ...patch })),
    [setSettings],
  );
  const value = useMemo(() => ({ settings, saveSettings }), [settings, saveSettings]);
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Shared localStorage helper — SSR safe, hydrates after mount        */
/* ------------------------------------------------------------------ */

function usePersistentState<T>(key: string, seed: T, migrate?: (value: T) => T) {
  const [value, setValue] = useState<T>(seed);
  // `hydrated` is state (not a ref) so the persist effect cannot race the
  // hydration effect and clobber storage with the seed on mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // Hydrating from an external system (localStorage) after mount is the
      // intended pattern here — server renders the seed, client upgrades.
      if (raw !== null) {
        const stored = JSON.parse(raw) as T;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(migrate ? migrate(stored) : stored);
      }
    } catch {
      /* corrupted storage — fall back to seed */
    }
    setHydrated(true);
  }, [key, migrate]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}

/* ------------------------------------------------------------------ */
/*  Currency                                                           */
/* ------------------------------------------------------------------ */

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
} | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = usePersistentState<Currency>(
    "wa:currency",
    "NGN",
  );
  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Catalog (seed + admin edits, persisted)                            */
/* ------------------------------------------------------------------ */

const CatalogContext = createContext<{
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  resetCatalog: () => void;
  getProduct: (slug: string) => Product | undefined;
  stockHistory: StockAdjustment[];
  adjustStock: (id: string, expected: number, quantity: number, reason: string) => boolean;
} | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = usePersistentState<Product[]>(
    "wa:catalog",
    seedProducts,
    migrateBrandCatalog,
  );
  const [stockHistory, setStockHistory] = usePersistentState<StockAdjustment[]>("wa:stock-history", []);
  const adjustStock = useCallback((id: string, expected: number, quantity: number, reason: string) => {
    const product = products.find((p) => p.id === id);
    if (!product || product.stock !== expected || !validStock(quantity) || !reason.trim() || quantity === expected) return false;
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: quantity } : p));
    setStockHistory((prev) => [{ id: crypto.randomUUID(), productId: id, productName: product.name, before: product.stock, after: quantity, reason: reason.trim(), createdAt: new Date().toISOString() }, ...prev].slice(0, 100));
    return true;
  }, [products, setProducts, setStockHistory]);

  const addProduct = useCallback(
    (p: Product) => setProducts((prev) => [p, ...prev]),
    [setProducts],
  );
  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>) =>
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      ),
    [setProducts],
  );
  const deleteProduct = useCallback(
    (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id)),
    [setProducts],
  );
  const resetCatalog = useCallback(
    () => setProducts(seedProducts),
    [setProducts],
  );
  const getProduct = useCallback(
    (slug: string) => products.find((p) => p.slug === slug) ?? products.find((p) => p.id === legacyProductSlugIds[slug]),
    [products],
  );

  const value = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      resetCatalog,
      getProduct,
      stockHistory,
      adjustStock,
    }),
    [products, addProduct, updateProduct, deleteProduct, resetCatalog, getProduct, stockHistory, adjustStock],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Cart                                                               */
/* ------------------------------------------------------------------ */

const CartContext = createContext<{
  items: CartItem[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (productId: string, size: number | null, qty?: number) => void;
  removeItem: (productId: string, size: number | null) => void;
  setQty: (productId: string, size: number | null, qty: number) => void;
  clear: () => void;
  count: number;
} | null>(null);

const sameLine = (a: CartItem, productId: string, size: number | null) =>
  a.productId === productId && a.size === size;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = usePersistentState<CartItem[]>("wa:cart", []);
  const [isOpen, setOpen] = useState(false);

  const addItem = useCallback(
    (productId: string, size: number | null, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => sameLine(i, productId, size));
        if (existing) {
          return prev.map((i) =>
            sameLine(i, productId, size) ? { ...i, qty: i.qty + qty } : i,
          );
        }
        return [...prev, { productId, size, qty }];
      });
    },
    [setItems],
  );

  const removeItem = useCallback(
    (productId: string, size: number | null) =>
      setItems((prev) => prev.filter((i) => !sameLine(i, productId, size))),
    [setItems],
  );

  const setQty = useCallback(
    (productId: string, size: number | null, qty: number) => {
      if (qty <= 0) {
        removeItem(productId, size);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (sameLine(i, productId, size) ? { ...i, qty } : i)),
      );
    },
    [setItems, removeItem],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, isOpen, setOpen, addItem, removeItem, setQty, clear, count }),
    [items, isOpen, addItem, removeItem, setQty, clear, count],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

const seedOrders: Order[] = [
  {
    id: "o-1",
    reference: "WA-7K2MQX",
    customer: { name: "Adaeze Okafor", email: "adaeze@example.com", phone: "+234 801 234 5678" },
    address: { line1: "14 Admiralty Way", city: "Lekki", state: "Lagos" },
    delivery: "express",
    items: [
      { productId: "p-ada-slip-dress", name: "Ada Silk Slip Dress", size: 10, qty: 1, priceNGN: 185000 },
      { productId: "p-oba-vermeil-hoops", name: "Oba Gold Vermeil Hoops", size: null, qty: 1, priceNGN: 85000 },
    ],
    totalNGN: 270000,
    status: "paid",
    createdAt: "2026-10-08T11:24:00.000Z",
  },
  {
    id: "o-2",
    reference: "WA-3F9TNB",
    customer: { name: "Temi Adebayo", email: "temi@example.com", phone: "+234 802 987 6543" },
    address: { line1: "8 Awolowo Road", city: "Ikoyi", state: "Lagos" },
    delivery: "standard",
    items: [
      { productId: "p-zuri-boxy-tee", name: "Zuri Boxy Tee", size: 12, qty: 2, priceNGN: 45000 },
    ],
    totalNGN: 90000,
    status: "fulfilled",
    createdAt: "2026-10-05T15:02:00.000Z",
  },
  {
    id: "o-3",
    reference: "WA-9Q4XZP",
    customer: { name: "Ngozi Eze", email: "ngozi@example.com", phone: "+234 803 456 7890" },
    address: { line1: "22 Trans-Amadi", city: "Port Harcourt", state: "Rivers" },
    delivery: "standard",
    items: [
      { productId: "p-nala-pendant-necklace", name: "Nala Pendant Necklace", size: null, qty: 1, priceNGN: 120000 },
    ],
    totalNGN: 120000,
    status: "pending",
    createdAt: "2026-10-10T09:41:00.000Z",
  },
];

const OrdersContext = createContext<{
  orders: Order[];
  addOrder: (o: Order) => void;
  setStatus: (id: string, status: Order["status"]) => void;
  updateOrder: (id: string, patch: Pick<Order, "internalNote" | "courier" | "trackingNumber">) => void;
} | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = usePersistentState<Order[]>("wa:orders", seedOrders);

  const addOrder = useCallback(
    (o: Order) => setOrders((prev) => [o, ...prev]),
    [setOrders],
  );
  const setStatus = useCallback(
    (id: string, status: Order["status"]) =>
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))),
    [setOrders],
  );
  const updateOrder = useCallback((id: string, patch: Pick<Order, "internalNote" | "courier" | "trackingNumber">) => {
    setOrders((prev) => prev.map((order) => order.id === id ? { ...order, ...patch } : order));
  }, [setOrders]);

  const value = useMemo(
    () => ({ orders, addOrder, setStatus, updateOrder }),
    [orders, addOrder, setStatus, updateOrder],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
