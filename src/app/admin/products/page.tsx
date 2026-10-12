"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { PackageIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useCatalog, useCurrency } from "@/lib/store";
import { useAdminView } from "@/components/admin/admin-view-context";
import { formatPrice } from "@/lib/format";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function DeleteButton({ onConfirm, name }: { onConfirm: () => void; name: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="inline-flex items-center gap-1"
      >
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            onConfirm();
            setConfirming(false);
            toast("Product removed", { description: name });
          }}
        >
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Keep
        </Button>
      </motion.span>
    );
  }

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Delete ${name}`}
      onClick={() => {
        setConfirming(true);
        window.setTimeout(() => setConfirming(false), 3000);
      }}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2Icon />
    </Button>
  );
}

export default function AdminProducts() {
  const { products, deleteProduct, resetCatalog } = useCatalog();
  const { currency } = useCurrency();
  const { tab: storedTab, sort } = useAdminView();
  const tab = ["all", "clothing", "jewelry"].includes(storedTab) ? storedTab : "all";

  // Toolbar state (tabs + sort) drives the visible list
  const visible = [...products]
    .filter((p) => tab === "all" || p.category === tab)
    .sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-desc":
          return b.priceNGN - a.priceNGN;
        case "stock":
          return a.stock - b.stock;
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
          {visible.length} of {products.length} pieces
        </p>
        <button
          type="button"
          onClick={() => {
            resetCatalog();
            toast("Catalog reset", { description: "Restored the original sample pieces." });
          }}
          className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <RotateCcwIcon className="size-3" />
          Reset sample data
        </button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted">
            <PackageIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">No products yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Add your first piece — it will appear on the storefront immediately.
          </p>
          <Button render={<Link href="/admin/products/new" />}>
            <PlusIcon data-icon="inline-start" />
            New product
          </Button>
        </div>
      ) : (
        <Reveal className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="max-lg:hidden">Sizes</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                          {product.images[0] ? (
                            <Image
                              src={product.images[0]}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                              unoptimized={product.images[0].startsWith("data:")}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <div className="flex items-center gap-1.5">
                            {product.badge && (
                              <Badge variant="secondary" className="text-[0.625rem] capitalize">
                                {product.badge}
                              </Badge>
                            )}
                            {product.compareAtNGN && (
                              <span className="text-[0.625rem] font-medium text-bronze">Sale</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {product.category}
                    </TableCell>
                    <TableCell className="max-lg:hidden text-muted-foreground tabular-nums">
                      {product.sizes.length > 0 ? product.sizes.join(" · ") : "One size"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(product.priceNGN, currency)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        product.stock <= 8 && "font-medium text-bronze",
                        product.stock <= 0 && "text-destructive",
                      )}
                    >
                      {product.stock}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${product.name}`}
                          render={<Link href={`/admin/products/${product.id}`} />}
                        >
                          <PencilIcon />
                        </Button>
                        <DeleteButton
                          name={product.name}
                          onConfirm={() => deleteProduct(product.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </Reveal>
      )}
    </div>
  );
}
