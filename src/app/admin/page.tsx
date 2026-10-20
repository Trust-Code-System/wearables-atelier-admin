"use client";
import Link from "next/link";
import { useAdminReport } from "@/lib/admin-resource";
import { useAdminCatalog } from "@/lib/admin-catalog";
import { moneyKobo } from "@/lib/admin-operations";
import { MetricCards } from "@/components/admin/management-ui";
import { LiveDataState } from "@/components/admin/live-data-state";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Button } from "@/components/ui/button";
export default function AdminOverview() {
  const resource = useAdminReport(),
    { products, error, loading } = useAdminCatalog();
  const report = resource.data;
  if (!report)
    return (
      <div className="p-6">
        <LiveDataState {...resource} />
      </div>
    );
  const low = products.filter(
    (product) =>
      product.backend.status !== "ARCHIVED" &&
      product.backend.variants.some(
        (variant) => !variant.archivedAt && variant.available <= 8,
      ),
  );
  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm">
        <p className="text-muted-foreground">
          Saved store data · reporting period {report.period.start} –{" "}
          {report.period.end} (UTC)
        </p>
        <Button variant="outline" onClick={resource.refresh}>
          Refresh overview
        </Button>
      </div>
      <MetricCards
        items={[
          {
            label: "Paid order totals",
            value: moneyKobo(report.totals.paidTotalKobo),
            hint: "Selected period · includes delivery and included VAT",
          },
          {
            label: "Pending orders",
            value: report.current.pendingOrders,
            hint: "All saved orders awaiting payment",
          },
          {
            label: "Needs review",
            value: report.current.needsAttention,
            hint: "Requires owner attention before fulfilment",
          },
          {
            label: "Low stock variants",
            value: report.current.lowStockVariants,
            hint: "8 available units or fewer · active catalog",
          },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <RevenueChart report={report} />
        <section className="grid gap-4 rounded-xl border bg-card p-5">
          <h2 className="font-display text-xl">Store activity</h2>
          <Link href="/admin/orders" className="flex justify-between">
            Orders in this period <strong>{report.totals.orders}</strong>
          </Link>
          <Link href="/admin/customers" className="flex justify-between">
            Customer records <strong>{report.current.customerRecords}</strong>
          </Link>
          <Link href="/admin/products" className="flex justify-between">
            Catalog products <strong>{report.current.products}</strong>
          </Link>
          <p className="text-xs text-muted-foreground">{report.recognition}</p>
        </section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-display text-xl">Top-selling pieces</h2>
          {report.topProducts.map((product) => (
            <div
              className="flex justify-between gap-3 border-t py-3 text-sm"
              key={product.productId}
            >
              <span>
                {product.productName}
                <small className="block text-muted-foreground">
                  {product.units} units
                </small>
              </span>
              <span>{moneyKobo(product.totalKobo)}</span>
            </div>
          ))}
          {!report.topProducts.length && (
            <p className="text-sm text-muted-foreground">
              No paid sales in this period.
            </p>
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-display text-xl">Low stock</h2>
          {error ? (
            <p role="alert">{error.message}</p>
          ) : loading ? (
            <p role="status">Loading inventory…</p>
          ) : (
            <>
              {low.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  href="/admin/inventory"
                  className="flex justify-between gap-3 border-t py-3 text-sm"
                >
                  <span>{product.name}</span>
                  <span>{product.stock} available</span>
                </Link>
              ))}
              {!low.length && (
                <p className="text-sm text-muted-foreground">
                  No low-stock products.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
