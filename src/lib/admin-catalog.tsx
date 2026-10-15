"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type CatalogPage, type CatalogProduct } from "./catalog-api";
import type { Product } from "./types";
export type AdminProduct = Product & { backend: CatalogProduct };
export function fromCatalog(product: CatalogProduct): AdminProduct {
  const variants = product.variants.filter((variant) => !variant.archivedAt);
  const cheapest = [...variants].sort((a, b) =>
    BigInt(a.priceKobo) < BigInt(b.priceKobo)
      ? -1
      : BigInt(a.priceKobo) > BigInt(b.priceKobo)
        ? 1
        : 0,
  )[0];
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category === "CLOTHING" ? "clothing" : "jewelry",
    priceNGN: cheapest ? Number(cheapest.priceKobo) / 100 : 0,
    compareAtNGN: cheapest?.compareAtPriceKobo
      ? Number(cheapest.compareAtPriceKobo) / 100
      : undefined,
    description: product.description,
    details: product.careDetails,
    images: product.images.flatMap((image) => (image.url ? [image.url] : [])),
    sizes: variants
      .flatMap((variant) =>
        variant.sizeLabel === "One size" ? [] : [Number(variant.sizeLabel)],
      )
      .sort((a, b) => a - b),
    stock: variants.reduce((total, variant) => total + variant.available, 0),
    badge: product.badge
      ? (product.badge.toLowerCase() as Product["badge"])
      : undefined,
    createdAt: product.createdAt,
    backend: product,
  };
}
const Context = createContext<{
  products: AdminProduct[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} | null>(null);
export function AdminCatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const collected: CatalogProduct[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await api<CatalogPage>(
          `/api/v1/admin/products?page=${page}&limit=100`,
          { signal: controller.signal },
        );
        collected.push(...result.data);
        totalPages = result.meta.totalPages;
        page++;
      } while (page <= totalPages);
      if (!controller.signal.aborted) {
        setProducts(collected.map(fromCatalog));
        setError(null);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setProducts([]);
        setError(
          cause instanceof Error ? cause : new Error("Could not load products"),
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh();
    }, 0);
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 10 * 60 * 1000);
    return () => {
      window.clearTimeout(initial);
      pending.current?.abort();
      window.removeEventListener("focus", focus);
      window.clearInterval(timer);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ products, loading, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useAdminCatalog() {
  const context = useContext(Context);
  if (!context) throw new Error("AdminCatalogProvider is required");
  return context;
}
