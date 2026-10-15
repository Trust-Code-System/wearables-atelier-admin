"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { archiveProduct } from "@/lib/catalog-api";
import Link from "next/link";
import {
  PackageIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useAdminCatalog } from "@/lib/admin-catalog";
import { displayKobo } from "@/lib/catalog-api";
import { useAdminView } from "@/components/admin/admin-view-context";
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

function DeleteButton({
  id,
  name,
  onRemoved,
}: {
  id: string;
  name: string;
  onRemoved: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirming)
    return (
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Delete ${name}`}
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2Icon />
      </Button>
    );
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1"
    >
      <Button
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await archiveProduct(id);
            await onRemoved();
            toast.success("Product removed", {
              description: "Archived; its history is preserved.",
            });
          } catch (cause) {
            toast.error(
              cause instanceof Error
                ? cause.message
                : "Could not remove product",
            );
          } finally {
            setBusy(false);
            setConfirming(false);
          }
        }}
      >
        {busy ? "Removing…" : "Confirm"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => setConfirming(false)}
      >
        Keep
      </Button>
    </motion.span>
  );
}

export default function AdminProducts() {
  const { products, loading, error, refresh } = useAdminCatalog();
  const { tab: storedTab, sort } = useAdminView();
  const tab = ["all", "clothing", "jewelry"].includes(storedTab)
    ? storedTab
    : "all";

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <RotateCcwIcon className="size-3" />
            Refresh products
          </button>
        </div>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading products…
        </p>
      ) : error ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted">
            <PackageIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">No products yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Add your first piece to the catalog.
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
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[0.625rem] capitalize"
                          >
                            {product.backend.status.toLowerCase()}
                          </Badge>
                          {product.badge && (
                            <Badge
                              variant="secondary"
                              className="text-[0.625rem] capitalize"
                            >
                              {product.badge}
                            </Badge>
                          )}
                          {product.compareAtNGN && (
                            <span className="text-[0.625rem] font-medium text-bronze">
                              Sale
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {product.category}
                  </TableCell>
                  <TableCell className="max-lg:hidden text-muted-foreground tabular-nums">
                    {product.sizes.length > 0
                      ? product.sizes.join(" · ")
                      : "One size"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.backend.variants
                      .filter((variant) => !variant.archivedAt)
                      .map((variant) => (
                        <div key={variant.id}>
                          <span className="text-xs text-muted-foreground">
                            {variant.sizeLabel}:{" "}
                          </span>
                          {displayKobo(variant.priceKobo)}
                        </div>
                      ))}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums text-muted-foreground"
                    title="Available units across active sizes"
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
                        id={product.id}
                        name={product.name}
                        onRemoved={refresh}
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
