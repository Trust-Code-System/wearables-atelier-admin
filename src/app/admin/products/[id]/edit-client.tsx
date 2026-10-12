"use client";

import Link from "next/link";
import { useCatalog } from "@/lib/store";
import { ProductForm } from "../product-form";
import { Button } from "@/components/ui/button";

export function EditProductClient({ id }: { id: string }) {
  const { products } = useCatalog();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <p className="font-display text-2xl">Product not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been removed. Head back to the product list.
        </p>
        <Button render={<Link href="/admin/products" />}>All products</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <p className="text-[0.8125rem] text-muted-foreground">
        <span className="font-medium text-foreground">{product.name}</span> — changes go
        live on the storefront as soon as you save.
      </p>
      <ProductForm existing={product} />
    </div>
  );
}
