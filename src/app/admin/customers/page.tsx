"use client";
import Link from "next/link";
import { useState } from "react";
import { useAdminReport, useAdminResource } from "@/lib/admin-resource";
import {
  moneyKobo,
  operationsPath,
  type CustomerDetail,
  type CustomerRecord,
  type Page,
} from "@/lib/admin-operations";
import { LiveDataState } from "@/components/admin/live-data-state";
import {
  ManagementFilter,
  ManagementSearch,
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
import { downloadCsv } from "@/lib/export-csv";
import { formatDate } from "@/lib/format";
function CustomerView({ record }: { record: CustomerRecord }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const resource = useAdminResource<CustomerDetail>(
    operationsPath(
      `customers/${record.kind}/${encodeURIComponent(record.id)}`,
      { limit: "20", cursor: cursors.at(-1) },
    ),
  );
  const customer = resource.data;
  if (!customer) return <LiveDataState {...resource} />;
  return (
    <div className="grid max-h-[65vh] gap-5 overflow-auto pr-2">
      <section className="text-sm">
        <h3 className="font-medium">Purchasing contact</h3>
        <p>{customer.contact.name || "Not provided"}</p>
        <p>{customer.contact.email || "Not provided"}</p>
        <p>{customer.contact.phone || "Not provided"}</p>
        {customer.account && (
          <div className="mt-3">
            <h3 className="font-medium">Linked account</h3>
            <p>
              {customer.account.name} · {customer.account.email}
            </p>
            <p>
              {customer.account.emailVerified
                ? "Email verified"
                : "Email not verified"}
            </p>
          </div>
        )}
      </section>
      {customer.addresses.length > 0 && (
        <section>
          <h3 className="mb-2 font-medium">Saved addresses</h3>
          {customer.addresses.map((address) => (
            <div
              className="mb-2 rounded-lg border p-3 text-sm"
              key={address.id}
            >
              <p>
                {address.recipientName}
                {address.isDefault ? " · Default" : ""}
              </p>
              <p>
                {address.line1} {address.line2}
              </p>
              <p>
                {address.city}, {address.state} {address.lga}
              </p>
              <p>{address.phone}</p>
            </div>
          ))}
        </section>
      )}
      <section>
        <h3 className="mb-3 font-medium">Order history</h3>
        {!customer.orders.data.length && (
          <p className="text-sm text-muted-foreground">
            No orders linked to this profile.
          </p>
        )}
        {customer.orders.data.map((order) => (
          <Link
            href={`/admin/orders/${order.id}`}
            key={order.id}
            className="mb-2 block rounded-lg border p-3 text-sm"
          >
            <p className="font-medium">{order.number}</p>
            <p>
              {formatDate(order.createdAt)} · {moneyKobo(order.totalKobo)}
            </p>
            <p>
              {order.paymentStatus} · {order.fulfilmentStatus}
            </p>
          </Link>
        ))}
        <div className="mt-3 flex gap-3">
          <Button
            variant="outline"
            disabled={cursors.length === 1}
            onClick={() => setCursors((values) => values.slice(0, -1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!customer.orders.meta.nextCursor}
            onClick={() =>
              setCursors((values) => [
                ...values,
                customer.orders.meta.nextCursor!,
              ])
            }
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
export default function CustomersPage() {
  const summary = useAdminReport();
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [selected, setSelected] = useState<CustomerRecord | null>(null),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const resource = useAdminResource<Page<CustomerRecord>>(
    operationsPath("customers", {
      q: query.trim(),
      kind,
      cursor: cursors.at(-1),
      limit: "20",
    }),
  );
  const result = resource.data;
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      {summary.data && (
        <MetricCards
          items={[
            {
              label: "Customer records",
              value: summary.data.current.customerRecords,
              hint: "Profiles and separate guest purchases",
            },
            {
              label: "Customer profiles",
              value: summary.data.current.profiles,
              hint: "Profiles can exist without accounts",
            },
            {
              label: "Guest purchases",
              value: summary.data.current.guestPurchases,
              hint: "Each unlinked order remains independent",
            },
          ]}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <ManagementSearch
          value={query}
          onChange={(value) => {
            setQuery(value);
            setCursors([undefined]);
          }}
          placeholder="Search customer records…"
        />
        <ManagementFilter
          label="Record type"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setCursors([undefined]);
          }}
          options={[
            { value: "all", label: "All records" },
            { value: "profile", label: "Customer profiles" },
            { value: "guest_order", label: "Guest purchases" },
          ]}
        />
        <Button variant="outline" onClick={resource.refresh}>
          Refresh customers
        </Button>
        <Button
          variant="outline"
          disabled={!result?.data.length}
          onClick={() =>
            result &&
            downloadCsv("wearables-customers-page.csv", [
              [
                "Record ID",
                "Type",
                "Contact name",
                "Contact email",
                "Phone",
                "Account email",
                "Order count",
              ],
              ...result.data.map((customer) => [
                customer.id,
                customer.kind,
                customer.contact.name ?? "",
                customer.contact.email ?? "",
                customer.contact.phone ?? "",
                customer.account?.email ?? "",
                customer.orderCount,
              ]),
            ])
          }
        >
          Export current page
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Guest purchases are not combined with profiles by email. Opening a
        record shows only its own linked history.
      </p>
      {!result ? (
        <LiveDataState {...resource} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Record type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((customer) => (
                  <TableRow key={`${customer.kind}:${customer.id}`}>
                    <TableCell>
                      <button
                        className="text-left font-medium underline-offset-4 hover:underline"
                        onClick={() => setSelected(customer)}
                      >
                        {customer.contact.name ||
                          customer.account?.name ||
                          "Customer profile"}
                      </button>
                      {customer.account && (
                        <p className="text-xs text-muted-foreground">
                          Account: {customer.account.email}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {customer.kind === "guest_order"
                          ? "Guest purchase"
                          : customer.account
                            ? "Account profile"
                            : "Independent profile"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p>
                        {customer.contact.email || "No purchasing email saved"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.contact.phone}
                      </p>
                    </TableCell>
                    <TableCell>{customer.orderCount}</TableCell>
                    <TableCell>{formatDate(customer.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!result.data.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      No matching customer records.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={cursors.length === 1}
              onClick={() => setCursors((values) => values.slice(0, -1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!result.meta.nextCursor}
              onClick={() =>
                setCursors((values) => [...values, result.meta.nextCursor!])
              }
            >
              Next
            </Button>
          </div>
        </>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.contact.name ||
                selected?.account?.name ||
                "Customer record"}
            </DialogTitle>
            <DialogDescription>
              {selected?.kind === "guest_order"
                ? "Contact and history from this guest purchase."
                : "Saved profile, linked account and purchasing history."}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <CustomerView
              key={`${selected.kind}:${selected.id}`}
              record={selected}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
