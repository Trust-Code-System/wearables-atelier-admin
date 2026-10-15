"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DownloadIcon,
  PackageCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminCatalog, type AdminProduct } from "@/lib/admin-catalog";
import { api, updateProduct, displayKobo } from "@/lib/catalog-api";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/lib/export-csv";
import { LOW_STOCK_THRESHOLD, stockLevel, validStock } from "@/lib/admin-data";
import {
  EmptyResults,
  ManagementFilter,
  ManagementSearch,
  MetricCards,
} from "@/components/admin/management-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STOCK_FILTERS = [
  { value: "all", label: "All stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "healthy", label: "Healthy stock" },
];
const REASONS = [
  { value: "Restock", label: "Restock" },
  { value: "Stock correction", label: "Stock correction" },
  { value: "Customer return", label: "Customer return" },
  { value: "Damage / loss", label: "Damage / loss" },
];

export default function InventoryPage() {
  const { products, loading, error: catalogError, refresh } = useAdminCatalog();
  const [stockHistory, setStockHistory] = useState<
    {
      id: string;
      productName: string;
      sizeLabel: string;
      before: number;
      after: number;
      reason: string;
      createdAt: string;
    }[]
  >([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: typeof stockHistory }>("/api/v1/admin/inventory/movements", {
      signal: controller.signal,
    })
      .then((result) => {
        setStockHistory(result.data);
        setHistoryError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : "Could not load stock history",
          );
      });
    return () => controller.abort();
  }, [products]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Restock");
  const [error, setError] = useState("");
  const visible = products
    .filter(
      (p) =>
        (filter === "all" || stockLevel(p.stock) === filter) &&
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.stock - b.stock);
  const totalUnits = products.reduce(
    (sum, product) =>
      sum +
      product.backend.variants
        .filter((variant) => !variant.archivedAt)
        .reduce((units, variant) => units + variant.onHand, 0),
    0,
  );
  const openAdjustment = (product: AdminProduct) => {
    setSelected(product);
    const variant = product.backend.variants.find((entry) => !entry.archivedAt);
    setSelectedSize(variant?.sizeLabel ?? "");
    setQuantity(String(variant?.onHand ?? 0));
    setReason("Restock");
    setError("");
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <MetricCards
        items={[
          {
            label: "Units on hand",
            value: totalUnits,
            hint: `Across ${products.length} products`,
          },
          {
            label: "Low stock",
            value: products.filter((p) => stockLevel(p.stock) === "low").length,
            hint: `1–${LOW_STOCK_THRESHOLD} units remaining`,
          },
          {
            label: "Out of stock",
            value: products.filter((p) => p.stock <= 0).length,
            hint: "Ready for replenishment",
          },
          {
            label: "Retail stock value",
            value: displayKobo(
              products
                .reduce(
                  (total, product) =>
                    total +
                    product.backend.variants
                      .filter((variant) => !variant.archivedAt)
                      .reduce(
                        (sum, variant) =>
                          sum +
                          BigInt(variant.priceKobo) * BigInt(variant.onHand),
                        BigInt(0),
                      ),
                  BigInt(0),
                )
                .toString(),
            ),
            hint: "At current selling prices",
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <ManagementSearch
          value={query}
          onChange={setQuery}
          placeholder="Search inventory…"
        />
        <ManagementFilter
          label="Stock level"
          value={filter}
          options={STOCK_FILTERS}
          onChange={setFilter}
        />
        <Button
          variant="outline"
          className="sm:ml-auto"
          disabled={!visible.length}
          onClick={() =>
            downloadCsv("wearables-inventory.csv", [
              [
                "Product",
                "Category",
                "Units",
                "Stock level",
                "Retail value NGN",
              ],
              ...visible.map((p) => [
                p.name,
                p.category,
                p.stock,
                stockLevel(p.stock),
                displayKobo(
                  p.backend.variants
                    .filter((variant) => !variant.archivedAt)
                    .reduce(
                      (sum, variant) =>
                        sum +
                        BigInt(variant.priceKobo) * BigInt(variant.onHand),
                      BigInt(0),
                    )
                    .toString(),
                ),
              ]),
            ])
          }
        >
          <DownloadIcon />
          Export inventory
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {visible.length} products · Quantities are totals across sizes.
        Adjustments are saved per size in the backend.
      </p>
      {loading ? (
        <p role="status">Loading inventory…</p>
      ) : catalogError ? (
        <div>
          <p role="alert">{catalogError.message}</p>
        </div>
      ) : !visible.length ? (
        <EmptyResults>
          No matching products. Try another search or stock filter.
        </EmptyResults>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {product.images[0] && (
                          <Image
                            src={product.images[0]}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.stock <= 0
                          ? "destructive"
                          : product.stock <= LOW_STOCK_THRESHOLD
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {product.stock <= 0
                        ? "Out of stock"
                        : product.stock <= LOW_STOCK_THRESHOLD
                          ? "Low stock"
                          : "In stock"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {product.backend.variants
                      .filter((variant) => !variant.archivedAt)
                      .reduce((sum, variant) => sum + variant.onHand, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Adjust stock for ${product.name}`}
                      onClick={() => openAdjustment(product)}
                    >
                      <SlidersHorizontalIcon />
                      Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <section className="mt-3 rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <PackageCheckIcon
            aria-hidden
            className="size-4 text-muted-foreground"
          />
          Recent stock adjustments
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Latest 100 stock changes, including adjustments made in the product
          editor.
        </p>
        {historyError ? (
          <p role="alert" className="py-4 text-sm text-destructive">
            {historyError}
          </p>
        ) : !stockHistory.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Your first adjustment will appear here with its reason and quantity
            change.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {stockHistory.slice(0, 10).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {entry.productName} · size {entry.sizeLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.reason} · {formatDate(entry.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-muted-foreground">
                    {entry.before} → {entry.after}
                  </span>
                  <Badge variant="secondary">
                    {entry.after - entry.before > 0 ? "+" : ""}
                    {entry.after - entry.before}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && !busy && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {selected?.name} · Currently {selected?.stock} units
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const next = Number(quantity);
              if (!quantity.trim() || !validStock(next) || next > 1_000_000) {
                setError("Enter a whole number of units from 0 to 1,000,000.");
                return;
              }
              if (!selected) return;
              const variant = selected.backend.variants.find(
                (entry) =>
                  entry.sizeLabel === selectedSize && !entry.archivedAt,
              );
              if (!variant) {
                setError("Select a size");
                return;
              }
              if (next === variant.onHand) {
                setError("Change the quantity before saving");
                return;
              }
              setBusy(true);
              try {
                const product = selected.backend;
                await updateProduct(product.id, {
                  name: product.name,
                  slug: product.slug,
                  category: product.category,
                  description: product.description,
                  careDetails: product.careDetails,
                  ...(product.badge ? { badge: product.badge } : {}),
                  expectedUpdatedAt: product.updatedAt,
                  stockReason: reason,
                  variants: product.variants
                    .filter((entry) => !entry.archivedAt)
                    .map((entry) => ({
                      sku: entry.sku,
                      sizeLabel: entry.sizeLabel,
                      priceKobo: entry.priceKobo,
                      ...(entry.compareAtPriceKobo
                        ? { compareAtPriceKobo: entry.compareAtPriceKobo }
                        : {}),
                      onHand: entry.id === variant.id ? next : entry.onHand,
                    })),
                });
                await refresh();
                toast.success("Stock updated", {
                  description: `${selected.name}, size ${selectedSize}: ${variant.onHand} → ${next}`,
                });
                setSelected(null);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not adjust stock",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <ManagementFilter
              label="Size"
              value={selectedSize}
              options={(selected?.backend.variants ?? [])
                .filter((variant) => !variant.archivedAt)
                .map((variant) => ({
                  value: variant.sizeLabel,
                  label: `Size ${variant.sizeLabel}`,
                }))}
              onChange={(size) => {
                setSelectedSize(size);
                setQuantity(
                  String(
                    selected?.backend.variants.find(
                      (variant) => variant.sizeLabel === size,
                    )?.onHand ?? 0,
                  ),
                );
                setError("");
              }}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock-quantity">
                New on-hand quantity for this size
              </Label>
              <Input
                id="stock-quantity"
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "stock-error" : undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Reason</Label>
              <ManagementFilter
                label="Adjustment reason"
                value={reason}
                options={REASONS}
                onChange={setReason}
              />
            </div>
            {error && (
              <p
                id="stock-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
