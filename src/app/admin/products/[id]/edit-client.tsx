"use client";
import Link from "next/link";
import { useAdminCatalog } from "@/lib/admin-catalog";
import { ApiError } from "@/lib/catalog-api";
import { CatalogSignIn } from "../catalog-sign-in";
import { ProductForm } from "../product-form";
import { Button } from "@/components/ui/button";
export function EditProductClient({ id }: { id: string }) {
  const { products, loading, error, refresh } = useAdminCatalog();
  const product = products.find((entry) => entry.id === id);
  if (loading)
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading product…
      </p>
    );
  if (error)
    return (
      <div className="space-y-4 p-6">
        <p role="alert">{error.message}</p>
        {error instanceof ApiError && [401, 403].includes(error.status) && (
          <CatalogSignIn onSuccess={() => void refresh()} />
        )}
      </div>
    );
  if (!product)
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <p className="font-display text-2xl">Product not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been removed. Head back to the product list.
        </p>
        <Button render={<Link href="/admin/products" />}>All products</Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <p className="text-[0.8125rem] text-muted-foreground">
        <span className="font-medium text-foreground">{product.name}</span> ·{" "}
        {product.backend.status.toLowerCase()}. Edit product details, prices,
        stock and images below.
      </p>
      <ProductForm key={product.id} existing={product} />
    </div>
  );
}
