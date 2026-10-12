"use client";

import Link from "next/link";
import { ArrowUpRightIcon, PackageIcon, ReceiptTextIcon, TriangleAlertIcon, WalletIcon } from "lucide-react";
import { useCatalog, useCurrency, useOrders } from "@/lib/store";
import { formatPrice, formatDate } from "@/lib/format";
import { isRecognizedSale } from "@/lib/admin-data";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "default",
  fulfilled: "secondary",
  pending: "outline",
  cancelled: "destructive",
};

export default function AdminOverview() {
  const { products } = useCatalog();
  const { orders } = useOrders();
  const { currency } = useCurrency();

  const revenue = orders
    .filter(isRecognizedSale)
    .reduce((sum, o) => sum + o.totalNGN, 0);
  const lowStock = products.filter((p) => p.stock <= 8);

  // Top products by units sold
  const topProducts = (() => {
    const tally = new Map<string, { qty: number; revenue: number }>();
    for (const order of orders) {
      if (!isRecognizedSale(order)) continue;
      for (const item of order.items) {
        const t = tally.get(item.productId) ?? { qty: 0, revenue: 0 };
        t.qty += item.qty;
        t.revenue += item.priceNGN * item.qty;
        tally.set(item.productId, t);
      }
    }
    return [...tally.entries()]
      .flatMap(([productId, t]) => {
        const product = products.find((p) => p.id === productId);
        return product ? [{ product, ...t }] : [];
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  })();
  const maxQty = Math.max(...topProducts.map((t) => t.qty), 1);

  const stats = [
    {
      icon: WalletIcon,
      label: "Revenue",
      value: formatPrice(revenue, currency),
      hint: "Paid and fulfilled orders only",
    },
    {
      icon: ReceiptTextIcon,
      label: "Pending orders",
      value: String(orders.filter((o) => o.status === "pending").length),
      hint: "Awaiting payment",
    },
    {
      icon: PackageIcon,
      label: "Catalog products",
      value: String(products.length),
      hint: `${products.filter((p) => p.category === "clothing").length} clothing · ${products.filter((p) => p.category === "jewelry").length} jewelry`,
    },
    {
      icon: TriangleAlertIcon,
      label: "Low stock",
      value: String(lowStock.length),
      hint: "8 units or fewer",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm"><p className="text-muted-foreground">Browser prototype · Storefront data is not connected yet.</p><Link href="/admin/inventory" className="inline-flex items-center gap-2 font-medium text-primary">Review inventory<ArrowUpRightIcon className="size-4" /></Link></div>
      <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StaggerItem key={stat.label}>
            <div className="admin-stat flex h-full min-w-0 flex-col gap-5 rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[0.8125rem] text-muted-foreground">{stat.label}</p>
                <span className="grid size-8 place-items-center rounded-lg bg-secondary">
                  <stat.icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
              </div>
              <div>
                <p className="admin-stat-value font-display tracking-tight tabular-nums">{stat.value}</p>
                <p className="mt-1 text-[0.75rem] text-muted-foreground">{stat.hint}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <RevenueChart />
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="font-display text-xl tracking-tight">Top products</h2>
            <p className="mt-0.5 text-[0.75rem] text-muted-foreground">By units sold</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bestsellers will rank here as orders come in.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {topProducts.map((t, i) => (
                <div key={t.product.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link href={`/admin/products/${t.product.id}`} className="min-w-0 text-[0.8125rem] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                      {t.product.name}
                    </Link>
                    <p className="shrink-0 text-[0.75rem] text-muted-foreground tabular-nums">
                      {t.qty} sold · {formatPrice(t.revenue, currency)}
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-bronze transition-[width] duration-700 [transition-timing-function:var(--ease-out-expo)]"
                      style={{ width: `${(t.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </div>

      <Reveal className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl tracking-tight">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="link-underline inline-flex items-center gap-1 text-[0.8125rem] font-medium"
          >
            View all
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="max-md:hidden">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.slice(0, 5).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium tabular-nums">{order.reference}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell className="max-md:hidden text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(order.totalNGN, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Reveal>
    </div>
  );
}
