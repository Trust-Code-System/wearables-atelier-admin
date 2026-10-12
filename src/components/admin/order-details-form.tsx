"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useOrders } from "@/lib/store";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OrderDetailsForm({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const [note, setNote] = useState(order.internalNote ?? "");
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const dirty =
    note !== (order.internalNote ?? "") ||
    courier !== (order.courier ?? "") ||
    tracking !== (order.trackingNumber ?? "");
  return (
    <form
      className="grid gap-4 border-t px-5 py-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        updateOrder(order.id, {
          internalNote: note.trim(),
          courier: courier.trim(),
          trackingNumber: tracking.trim(),
        });
        setNote(note.trim());
        setCourier(courier.trim());
        setTracking(tracking.trim());
        toast.success("Order details saved", {
          description: "Saved in this browser. No customer message was sent.",
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`note-${order.id}`}>Internal note</Label>
        <Textarea
          id={`note-${order.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          placeholder="Packing instructions, follow-up, or customer requests…"
          className="min-h-24"
        />
        <p className="text-xs text-muted-foreground">
          For your team’s reference; saved locally.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`courier-${order.id}`}>Courier</Label>
          <Input
            id={`courier-${order.id}`}
            value={courier}
            onChange={(event) => setCourier(event.target.value)}
            maxLength={100}
            placeholder="Delivery company"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`tracking-${order.id}`}>Tracking number</Label>
          <Input
            id={`tracking-${order.id}`}
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            maxLength={100}
            placeholder="Delivery reference"
          />
        </div>
        <Button type="submit" className="self-end" disabled={!dirty}>
          Save details
        </Button>
      </div>
    </form>
  );
}
