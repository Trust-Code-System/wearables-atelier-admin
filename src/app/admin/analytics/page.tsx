"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { useOrders, useCurrency } from "@/lib/store";
import {
  salesSummary,
  ordersInRange,
  topSellingItems,
  ORDER_STATUSES,
} from "@/lib/admin-data";
import { downloadCsv } from "@/lib/export-csv";
import { formatPrice } from "@/lib/format";
import { EmptyResults, MetricCards } from "@/components/admin/management-ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AnalyticsPage() {
  const { orders } = useOrders();
  const { currency } = useCurrency();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const invalid = !!(start && end && start > end);
  const selected = invalid ? [] : ordersInRange(orders, start, end);
  const summary = salesSummary(selected);
  const topItems = topSellingItems(selected);
  const statusCounts = ORDER_STATUSES.map((status) => ({
    status,
    count: selected.filter((order) => order.status === status).length,
  }));
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-start">From</Label>
          <Input
            id="report-start"
            type="date"
            className="h-9 w-40"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            max={end || undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-end">To</Label>
          <Input
            id="report-end"
            type="date"
            className="h-9 w-40"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            min={start || undefined}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setStart("");
            setEnd("");
          }}
          disabled={!start && !end}
        >
          All time
        </Button>
        <Button
          variant="outline"
          className="sm:ml-auto"
          disabled={invalid || !selected.length}
          onClick={() =>
            downloadCsv("wearables-sales-report.csv", [
              [
                "Reference",
                "Date",
                "Status",
                "Total NGN",
                "Recognized revenue NGN",
                "Units",
              ],
              ...selected.map((order) => [
                order.reference,
                order.createdAt,
                order.status,
                order.totalNGN,
                order.status === "paid" || order.status === "fulfilled"
                  ? order.totalNGN
                  : 0,
                order.items.reduce((sum, item) => sum + item.qty, 0),
              ]),
            ])
          }
        >
          <DownloadIcon />
          Export report
        </Button>
      </div>
      {invalid && (
        <p role="alert" className="text-sm text-destructive">
          The end date must be on or after the start date.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {selected.length} local orders · Revenue includes paid and fulfilled
        orders only. Date filters use order dates in UTC.
      </p>
      <MetricCards
        items={[
          {
            label: "Recognized revenue",
            value: formatPrice(summary.revenue, currency),
            hint: "Pending and cancelled orders excluded",
          },
          {
            label: "Paid orders",
            value: summary.sales.length,
            hint: "Paid or fulfilled in this period",
          },
          {
            label: "Average order value",
            value: formatPrice(summary.average, currency),
            hint: "Per paid or fulfilled order",
          },
          {
            label: "Units sold",
            value: summary.units,
            hint: "In paid and fulfilled orders",
          },
        ]}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <RevenueChart orders={selected} />
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Order breakdown</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            By current order status
          </p>
          <div className="mt-6 flex flex-col gap-5">
            {statusCounts.map(({ status, count }) => (
              <div key={status}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${selected.length ? (count / selected.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Products by sales value</h2>
        {!topItems.length ? (
          <EmptyResults>
            No paid sales in this period. Adjust the dates to see other orders.
          </EmptyResults>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units sold</TableHead>
                  <TableHead className="text-right">Item sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.units}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(item.revenue, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Item sales use prices captured on each order. Order totals may also
          include delivery or discounts.
        </p>
      </section>
    </div>
  );
}
