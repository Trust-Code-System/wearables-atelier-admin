"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon, DownloadIcon } from "lucide-react";
import { useAdminView } from "@/components/admin/admin-view-context";
import { useAdminResource } from "@/lib/admin-resource";
import {
  moneyKobo,
  operationsPath,
  type OrderSummary,
  type Page,
} from "@/lib/admin-operations";
import { LiveOrderDetail } from "@/components/admin/live-order-detail";
import { LiveDataState } from "@/components/admin/live-data-state";
import { ManagementSearch } from "@/components/admin/management-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadCsv } from "@/lib/export-csv";
import { formatDate } from "@/lib/format";
function OrdersList({ tab }: { tab: string }) {
  const [query, setQuery] = useState(""),
    [expanded, setExpanded] = useState<string | null>(null),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const filter =
    tab === "fulfilled"
      ? { fulfilmentStatus: "delivered" }
      : tab === "attention"
        ? { needsAttention: "true" }
        : tab !== "all"
          ? { paymentStatus: tab }
          : {};
  const resource = useAdminResource<Page<OrderSummary>>(
    operationsPath("orders", {
      ...filter,
      q: query.trim(),
      cursor: cursors.at(-1),
      limit: "20",
    }),
  );
  const result = resource.data;
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap gap-3">
        <ManagementSearch
          value={query}
          placeholder="Search orders or buyer details…"
          onChange={(value) => {
            setQuery(value);
            setCursors([undefined]);
            setExpanded(null);
          }}
        />
        <Button variant="outline" onClick={resource.refresh}>
          Refresh orders
        </Button>
        <Button
          variant="outline"
          disabled={!result?.data.length}
          onClick={() =>
            result &&
            downloadCsv("wearables-orders-page.csv", [
              [
                "Order",
                "Buyer",
                "Email",
                "Payment",
                "Fulfilment",
                "Total kobo",
                "Created",
              ],
              ...result.data.map((order) => [
                order.number,
                order.contact.name,
                order.contact.email,
                order.paymentStatus,
                order.fulfilmentStatus,
                order.totalKobo,
                order.createdAt,
              ]),
            ])
          }
        >
          <DownloadIcon />
          Export current page
        </Button>
      </div>
      {!result ? (
        <LiveDataState {...resource} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.data.length} orders on this page · newest first
          </p>
          {!result.data.length && (
            <div className="rounded-xl border border-dashed p-12 text-center">
              No matching saved orders.
            </div>
          )}
          {result.data.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <button
                className="flex w-full flex-wrap items-center gap-4 p-5 text-left"
                onClick={() =>
                  setExpanded(expanded === order.id ? null : order.id)
                }
                aria-expanded={expanded === order.id}
              >
                <span className="flex-1">
                  <span className="font-medium">{order.number}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {order.contact.name} · {formatDate(order.createdAt)}
                  </span>
                </span>
                <Badge
                  variant={order.needsAttention ? "destructive" : "outline"}
                >
                  {order.paymentStatus}
                </Badge>
                <Badge variant="secondary">{order.fulfilmentStatus}</Badge>
                <span>{moneyKobo(order.totalKobo)}</span>
                <ChevronDownIcon className="size-4" />
              </button>
              {expanded === order.id && (
                <div className="border-t">
                  <Link
                    className="ml-6 mt-4 inline-block text-sm underline"
                    href={`/admin/orders/${order.id}`}
                  >
                    Open order page
                  </Link>
                  <LiveOrderDetail id={order.id} />
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={cursors.length === 1}
              onClick={() => {
                setExpanded(null);
                setCursors((values) => values.slice(0, -1));
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!result.meta.nextCursor}
              onClick={() => {
                setExpanded(null);
                setCursors((values) => [...values, result.meta.nextCursor!]);
              }}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export default function OrdersPage() {
  const { tab } = useAdminView();
  const selected = [
    "all",
    "pending",
    "paid",
    "fulfilled",
    "cancelled",
    "attention",
    "failed",
    "refunded",
  ].includes(tab)
    ? tab
    : "all";
  return <OrdersList key={selected} tab={selected} />;
}
