"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDownIcon, DownloadIcon, ReceiptTextIcon } from "lucide-react";
import { useCurrency, useOrders } from "@/lib/store";
import { useAdminView } from "@/components/admin/admin-view-context";
import { formatDate, formatPrice } from "@/lib/format";
import { EASE_OUT, Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";
import { downloadCsv } from "@/lib/export-csv";
import { ManagementSearch } from "@/components/admin/management-ui";
import { Button } from "@/components/ui/button";
import { OrderDetailsForm } from "@/components/admin/order-details-form";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "default",
  fulfilled: "secondary",
  pending: "outline",
  cancelled: "destructive",
};

const STATUSES: OrderStatus[] = ["pending", "paid", "fulfilled", "cancelled"];

export default function AdminOrders() {
  const { orders, setStatus } = useOrders();
  const { currency } = useCurrency();
  const { tab: storedTab } = useAdminView();
  const tab = ["all", ...STATUSES].includes(storedTab) ? storedTab : "all";
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Toolbar tab filters by status
  const visible = orders.filter((o) => (tab === "all" || o.status === tab) && `${o.reference} ${o.customer.name} ${o.customer.email} ${o.customer.phone}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><ManagementSearch value={query} onChange={setQuery} placeholder="Search orders or customers…" /><Button variant="outline" disabled={!visible.length} onClick={() => downloadCsv("wearables-orders.csv", [["Reference", "Customer", "Email", "Status", "Total NGN", "Date", "Courier", "Tracking number"], ...visible.map((order) => [order.reference, order.customer.name, order.customer.email, order.status, order.totalNGN, order.createdAt, order.courier ?? "", order.trackingNumber ?? ""])])}><DownloadIcon />Export orders</Button></div>
      <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
        {visible.length} of {orders.length} orders — newest first
      </p>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted">
            <ReceiptTextIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">No orders yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            This browser has no order records. Storefront syncing will be added with the shared backend.
          </p>
        </div>
      ) : (
        visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
            <p className="font-display text-lg">No matching orders</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Try another search or status tab.
            </p>
          </div>
        ) : (
        <Reveal className="flex flex-col gap-3">
          {visible.map((order) => {
            const open = expanded === order.id;
            return (
              <div key={order.id} className="overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : order.id)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left transition-colors duration-150 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium tabular-nums">{order.reference}</span>
                  <span className="text-sm text-muted-foreground">{order.customer.name}</span>
                  <span className="text-[0.75rem] text-muted-foreground max-md:hidden">
                    {formatDate(order.createdAt)}
                  </span>
                  <span className="text-[0.75rem] text-muted-foreground tabular-nums max-lg:hidden">
                    {order.items.reduce((n, i) => n + i.qty, 0)} items
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                      {order.status}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {formatPrice(order.totalNGN, currency)}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-200 [transition-timing-function:var(--ease-out-expo)]",
                        open && "rotate-180",
                      )}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [...EASE_OUT] }}
                    >
                      <Separator />
                      <div className="grid gap-6 px-5 py-5 md:grid-cols-[1.4fr_1fr_1fr]">
                        <div className="flex flex-col gap-2">
                          <p className="eyebrow">Items</p>
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between gap-4 text-[0.8125rem]">
                              <span className="text-muted-foreground">
                                {item.qty} × {item.name}
                                {item.size !== null && (
                                  <span className="tabular-nums"> — size {item.size}</span>
                                )}
                              </span>
                              <span className="tabular-nums">
                                {formatPrice(item.priceNGN * item.qty, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="eyebrow">Delivery</p>
                          <p className="text-[0.8125rem] text-muted-foreground capitalize">
                            {order.delivery} — {order.address.line1}, {order.address.city},{" "}
                            {order.address.state}
                          </p>
                          <p className="text-[0.8125rem] text-muted-foreground">
                            {order.customer.email}
                            <br />
                            {order.customer.phone}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="eyebrow">Status</p>
                          <Select
                            value={order.status}
                            onValueChange={(v) => { if (v) { setStatus(order.id, v as OrderStatus); toast.success("Order status updated", { description: "Saved locally. Inventory is unchanged." }); } }}
                          >
                            <SelectTrigger className="w-40" aria-label="Order status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <OrderDetailsForm key={order.id} order={order} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
        )
      )}
    </div>
  );
}
