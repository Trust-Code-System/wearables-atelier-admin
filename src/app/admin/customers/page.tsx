"use client";

import { useState } from "react";
import { DownloadIcon, UsersIcon } from "lucide-react";
import { useCurrency, useOrders } from "@/lib/store";
import { customersFromOrders } from "@/lib/admin-data";
import { downloadCsv } from "@/lib/export-csv";
import { formatDate, formatPrice } from "@/lib/format";
import {
  EmptyResults,
  ManagementSearch,
  ManagementFilter,
  MetricCards,
} from "@/components/admin/management-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomersPage() {
  const { orders } = useOrders();
  const { currency } = useCurrency();
  const customers = customersFromOrders(orders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = customers.find((c) => c.key === selectedKey);
  const visible = customers.filter(
    (c) =>
      (filter === "all" ||
        c.orders.filter((o) => o.status !== "cancelled").length > 1) &&
      `${c.name} ${c.email} ${c.phone} ${c.location}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const returning = customers.filter(
    (c) => c.orders.filter((o) => o.status !== "cancelled").length > 1,
  ).length;
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <MetricCards
        items={[
          {
            label: "Customers",
            value: customers.length,
            hint: "From local order records",
          },
          {
            label: "Returning customers",
            value: returning,
            hint: "More than one non-cancelled order",
          },
          {
            label: "Customer spending",
            value: formatPrice(
              customers.reduce((sum, c) => sum + c.spent, 0),
              currency,
            ),
            hint: "Paid and fulfilled orders",
          },
          {
            label: "Orders per customer",
            value: customers.length
              ? (orders.length / customers.length).toFixed(1)
              : "0",
            hint: "Includes every order status",
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <ManagementSearch
          value={query}
          onChange={setQuery}
          placeholder="Search customers…"
        />
        <ManagementFilter
          label="Customer type"
          value={filter}
          options={[
            { value: "all", label: "All customers" },
            { value: "returning", label: "Returning customers" },
          ]}
          onChange={setFilter}
        />
        <Button
          className="sm:ml-auto"
          variant="outline"
          disabled={!visible.length}
          onClick={() =>
            downloadCsv("wearables-customers.csv", [
              [
                "Name",
                "Email",
                "Phone",
                "Location",
                "Orders",
                "Paid spending NGN",
                "Last order",
              ],
              ...visible.map((c) => [
                c.name,
                c.email,
                c.phone,
                c.location,
                c.orders.length,
                c.spent,
                c.lastOrder,
              ]),
            ])
          }
        >
          <DownloadIcon />
          Export customers
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {visible.length} customers · These are order contacts, not registered
        customer accounts.
      </p>
      {!visible.length ? (
        <EmptyResults>
          <UsersIcon aria-hidden className="mx-auto mb-3 size-6" />
          No matching customers. Profiles appear when this admin browser has
          order records.
        </EmptyResults>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="max-lg:hidden">Location</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="max-md:hidden">Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((customer) => (
                <TableRow key={customer.key}>
                  <TableCell>
                    <button
                      className="flex items-center gap-3 text-left hover:opacity-80"
                      onClick={() => setSelectedKey(customer.key)}
                      aria-label={`View customer ${customer.name}`}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {customer.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("") || "?"}
                      </span>
                      <span>
                        <span className="block font-medium">
                          {customer.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {customer.email || customer.phone}
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="max-lg:hidden text-muted-foreground">
                    {customer.location}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {customer.orders.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(customer.spent, currency)}
                  </TableCell>
                  <TableCell className="max-md:hidden text-muted-foreground">
                    {formatDate(customer.lastOrder)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedKey(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Contact details and order history in this browser.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <dl className="grid gap-3 rounded-lg bg-secondary p-4 text-sm sm:grid-cols-2">
                {[
                  ["Email", selected.email || "Not provided"],
                  ["Phone", selected.phone || "Not provided"],
                  ["Location", selected.location],
                  ["Paid spending", formatPrice(selected.spent, currency)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <h2 className="font-semibold">Order history</h2>
              <ul className="divide-y">
                {selected.orders.map((order) => (
                  <li key={order.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{order.reference}</p>
                      <Badge className="capitalize" variant="secondary">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(order.createdAt)} ·{" "}
                      {formatPrice(order.totalNGN, currency)}
                    </p>
                    <p className="mt-2 text-sm">
                      {order.items
                        .map((item) => `${item.qty} × ${item.name}`)
                        .join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
