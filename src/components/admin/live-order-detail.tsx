"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAdminResource } from "@/lib/admin-resource";
import {
  announceAdminChange,
  availableFulfilment,
  moneyKobo,
  operationsPath,
  saveFulfilment,
  type OrderDetail,
} from "@/lib/admin-operations";
import { LiveDataState } from "./live-data-state";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
function FulfilmentForm({ order }: { order: OrderDetail }) {
  const choices = availableFulfilment(order);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!choices.length)
    return (
      <p className="text-sm text-muted-foreground">
        {order.paymentStatus === "paid" &&
        order.payment.allocationStatus === "settled"
          ? "There is no further fulfilment update for this order."
          : "Fulfilment is available after verified payment and stock allocation."}
      </p>
    );
  const status = choices[0];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await saveFulfilment(order, {
        status,
        reason: String(values.get("reason") ?? "").trim(),
        ...(status === "shipped"
          ? {
              carrier: String(values.get("carrier") ?? "").trim(),
              trackingReference: String(
                values.get("trackingReference") ?? "",
              ).trim(),
            }
          : {}),
        ...(values.get("ownerNote")
          ? { ownerNote: String(values.get("ownerNote")).trim() }
          : {}),
      });
      toast.success("Fulfilment updated");
      announceAdminChange();
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to save the update. Refresh the order before retrying.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="grid gap-3 rounded-xl border p-4" onSubmit={submit}>
      <h3 className="font-medium">Mark as {status}</h3>
      <label className="grid gap-1 text-sm">
        Reason
        <Input name="reason" required maxLength={255} />
      </label>
      {status === "shipped" && (
        <>
          <label className="grid gap-1 text-sm">
            Carrier / collection provider
            <Input name="carrier" required maxLength={100} />
          </label>
          <label className="grid gap-1 text-sm">
            Tracking / collection reference
            <Input name="trackingReference" required maxLength={120} />
          </label>
        </>
      )}
      <label className="grid gap-1 text-sm">
        Owner note (optional)
        <Textarea name="ownerNote" maxLength={1000} />
      </label>
      <Button type="submit" className="justify-self-start" disabled={busy}>
        {busy ? "Saving…" : `Save ${status} update`}
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
export function LiveOrderDetail({ id }: { id: string }) {
  const resource = useAdminResource<OrderDetail>(
    operationsPath(`orders/${encodeURIComponent(id)}`),
  );
  const order = resource.data;
  if (!order) return <LiveDataState {...resource} />;
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">{order.number}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <Button variant="outline" onClick={resource.refresh}>
          Refresh order
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{order.paymentStatus}</Badge>
        <Badge variant="secondary">{order.fulfilmentStatus}</Badge>
        <Badge variant="outline">Funds: {order.payment.financialStatus}</Badge>
        <Badge variant="outline">Stock: {order.payment.allocationStatus}</Badge>
      </div>
      {order.needsAttention && (
        <div role="status" className="rounded-xl border border-amber-500 p-4">
          <p className="font-medium">Needs owner review</p>
          <ul>
            {order.reviewReasons.map((reason) => (
              <li key={reason.id}>{reason.label}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Fulfilment is blocked while this order needs review.
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="mb-2 font-medium">Buyer</h3>
          <p>{order.contact.name}</p>
          <p>{order.contact.email}</p>
          <p>{order.contact.phone}</p>
        </section>
        <section>
          <h3 className="mb-2 font-medium">Delivery / collection</h3>
          <p>{order.delivery.recipientName}</p>
          <p>{order.delivery.method}</p>
          <p>{order.delivery.line1}</p>
          {order.delivery.line2 && <p>{order.delivery.line2}</p>}
          {order.delivery.method !== "Store pickup" && (
            <p>
              {order.delivery.city}, {order.delivery.state}
              {order.delivery.lga ? ` · ${order.delivery.lga}` : ""}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {order.delivery.estimate}
          </p>
        </section>
      </div>
      <section className="rounded-xl border p-4">
        <h3 className="mb-3 font-medium">Purchased items</h3>
        {order.lines.map((line) => (
          <div
            key={line.id}
            className="flex justify-between gap-4 py-2 text-sm"
          >
            <span>
              {line.quantity} × {line.productName} · {line.sizeLabel}
            </span>
            <span>{moneyKobo(line.totalKobo)}</span>
          </div>
        ))}
        <dl className="mt-3 grid gap-2 border-t pt-3 text-sm">
          {[
            ["Subtotal", order.subtotalKobo],
            ["Discount", order.discountKobo],
            ["Delivery", order.shippingKobo],
            ["Included VAT", order.taxKobo],
            ["Total", order.totalKobo],
          ].map(([label, value]) => (
            <div className="flex justify-between" key={label}>
              <dt>{label}</dt>
              <dd>{moneyKobo(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <FulfilmentForm key={order.version} order={order} />
      <section>
        <h3 className="mb-3 font-medium">Fulfilment history</h3>
        {!order.fulfilments.length && (
          <p className="text-sm text-muted-foreground">
            No fulfilment updates yet.
          </p>
        )}
        {order.fulfilments.map((entry) => (
          <div key={entry.id} className="mb-2 rounded-lg border p-3 text-sm">
            <p>
              {entry.status} · {formatDate(entry.createdAt)}
            </p>
            {entry.carrier && (
              <p>
                {entry.carrier} · {entry.trackingReference}
              </p>
            )}
            {entry.ownerNote && (
              <p className="mt-1 text-muted-foreground">
                Owner note: {entry.ownerNote}
              </p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
