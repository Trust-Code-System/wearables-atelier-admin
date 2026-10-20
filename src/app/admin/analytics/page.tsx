"use client";
import { useState } from "react";
import { useAdminResource } from "@/lib/admin-resource";
import {
  moneyKobo,
  operationsPath,
  type AdminReport,
} from "@/lib/admin-operations";
import { MetricCards } from "@/components/admin/management-ui";
import { LiveDataState } from "@/components/admin/live-data-state";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/export-csv";
export default function AnalyticsPage() {
  const [draft, setDraft] = useState({ start: "", end: "" }),
    [range, setRange] = useState({ start: "", end: "" });
  const resource = useAdminResource<AdminReport>(
      operationsPath("reports", range),
    ),
    report = resource.data;
  const invalid = Boolean(draft.start && draft.end && draft.start > draft.end);
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) setRange(draft);
        }}
      >
        <label className="grid gap-1 text-sm">
          From
          <Input
            type="date"
            value={draft.start}
            max={draft.end || undefined}
            onChange={(event) =>
              setDraft((value) => ({ ...value, start: event.target.value }))
            }
          />
        </label>
        <label className="grid gap-1 text-sm">
          To
          <Input
            type="date"
            value={draft.end}
            min={draft.start || undefined}
            onChange={(event) =>
              setDraft((value) => ({ ...value, end: event.target.value }))
            }
          />
        </label>
        <Button type="submit" disabled={invalid}>
          Apply dates
        </Button>
        <Button variant="outline" type="button" onClick={resource.refresh}>
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!report}
          onClick={() =>
            report &&
            downloadCsv("wearables-paid-orders-report.csv", [
              ["UTC date", "Paid orders", "Gross paid total kobo"],
              ...report.daily.map((day) => [
                day.date,
                day.paidOrders,
                day.paidTotalKobo,
              ]),
            ])
          }
        >
          Export report
        </Button>
      </form>
      {invalid && (
        <p role="alert">Choose an end date on or after the start date.</p>
      )}
      {!report ? (
        <LiveDataState {...resource} />
      ) : (
        <>
          <MetricCards
            items={[
              {
                label: "Orders",
                value: report.totals.orders,
                hint: "Created in the selected UTC period",
              },
              {
                label: "Paid orders",
                value: report.totals.paidOrders,
                hint: "Current paid status",
              },
              {
                label: "Gross paid order totals",
                value: moneyKobo(report.totals.paidTotalKobo),
                hint: "Includes delivery and included VAT",
              },
            ]}
          />
          <RevenueChart report={report} />
          <p className="text-xs text-muted-foreground">{report.recognition}</p>
          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 font-display text-xl">Payment statuses</h2>
              {report.statuses.map((row) => (
                <div
                  className="flex justify-between border-t py-2 text-sm"
                  key={row.status}
                >
                  <span>{row.status}</span>
                  <span>{row.count}</span>
                </div>
              ))}
            </section>
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 font-display text-xl">Best-selling items</h2>
              {report.topProducts.map((product) => (
                <div
                  className="flex justify-between gap-3 border-t py-2 text-sm"
                  key={product.productId}
                >
                  <span>
                    {product.productName} · {product.units} units
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
          </div>
        </>
      )}
    </div>
  );
}
