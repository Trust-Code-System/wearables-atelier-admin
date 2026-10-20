import { api } from "./catalog-api.ts";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "requires_review"
  | "partially_refunded"
  | "refunded";
export type FulfilmentStatus =
  "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled";
export type OrderSummary = {
  id: string;
  number: string;
  contact: { name: string; email: string };
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  totalKobo: string;
  version: number;
  createdAt: string;
  financialStatus: string;
  allocationStatus: string;
  needsAttention: boolean;
  reviewReasons: { id: string; label: string }[];
};
export type Page<T> = {
  data: T[];
  meta: { limit: number; nextCursor: string | null };
};
export type OrderDetail = Omit<
  OrderSummary,
  "financialStatus" | "allocationStatus"
> & {
  contact: { name: string; email: string; phone: string };
  delivery: {
    recipientName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    lga: string | null;
    method: string;
    estimate: string;
  };
  subtotalKobo: string;
  shippingKobo: string;
  taxKobo: string;
  discountKobo: string;
  payment: {
    status: string;
    financialStatus: string;
    allocationStatus: string;
  };
  lines: {
    id: string;
    productId: string;
    productName: string;
    sizeLabel: string;
    quantity: number;
    totalKobo: string;
  }[];
  fulfilments: {
    id: string;
    status: string;
    carrier: string | null;
    trackingReference: string | null;
    ownerNote: string | null;
    createdAt: string;
  }[];
  events: {
    id: string;
    kind: string;
    fromState: string;
    toState: string;
    reason: string;
    createdAt: string;
  }[];
};
export type CustomerRecord = {
  id: string;
  kind: "profile" | "guest_order";
  createdAt: string;
  contact: { name: string | null; email: string | null; phone: string | null };
  account: { name: string; email: string; emailVerified: boolean } | null;
  orderCount: number;
  orderNumber: string | null;
};
export type CustomerDetail = Omit<
  CustomerRecord,
  "orderCount" | "orderNumber"
> & {
  addresses: {
    id: string;
    recipientName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    lga: string | null;
    isDefault: boolean;
  }[];
  orders: Page<OrderSummary>;
};
export type AdminReport = {
  period: { start: string; end: string; timezone: string };
  totals: { orders: number; paidOrders: number; paidTotalKobo: string };
  statuses: { status: PaymentStatus; count: number }[];
  daily: { date: string; paidTotalKobo: string; paidOrders: number }[];
  topProducts: {
    productId: string;
    productName: string;
    units: number;
    totalKobo: string;
  }[];
  current: {
    pendingOrders: number;
    needsAttention: number;
    profiles: number;
    guestPurchases: number;
    customerRecords: number;
    products: number;
    lowStockVariants: number;
  };
  recognition: string;
};
export type ShippingPolicy = {
  timezone: "Africa/Lagos";
  preparation: { weekdays: number[]; workingDays: number };
  transit: {
    weekdays: number[];
    minWorkingDays: number;
    maxWorkingDays: number;
  };
  dispatch: { weekdays: number[]; hours: { from: string; to: string } };
  holidays: string[];
  pickup: {
    enabled: boolean;
    address: string;
    phone: string;
    hours: { from: string; to: string };
    weekdays: number[] | null;
    requiresCode: true;
  };
};
export type ShippingSettings = { version: number; policy: ShippingPolicy };
export type ShippingRate = {
  id: string;
  destinationId: string;
  destination: { name: string };
  method: "collection" | "doorstep" | "park";
  feeKobo: string;
  enabled: boolean;
};

export function moneyKobo(value: string) {
  if (!/^-?\d+$/.test(value)) throw new Error("Invalid money value");
  const raw = BigInt(value),
    amount = raw < BigInt("0") ? -raw : raw;
  return `${raw < BigInt("0") ? "-" : ""}₦${(amount / BigInt("100")).toLocaleString("en-NG")}.${(amount % BigInt("100")).toString().padStart(2, "0")}`;
}
export function chartNaira(value: string) {
  if (!/^\d+$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
    return null;
  return Number(value) / 100;
}
export function availableFulfilment(
  order: OrderDetail,
): ("processing" | "shipped" | "delivered")[] {
  if (
    order.paymentStatus !== "paid" ||
    order.payment.allocationStatus !== "settled"
  )
    return [];
  if (order.fulfilmentStatus === "unfulfilled") return ["processing"];
  if (order.fulfilmentStatus === "processing") return ["shipped"];
  if (order.fulfilmentStatus === "shipped") return ["delivered"];
  return [];
}
export function operationsPath(
  resource: string,
  params: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params))
    if (value) query.set(name, value);
  return `/api/v1/admin/${resource}${query.size ? `?${query}` : ""}`;
}
export function announceAdminChange() {
  window.dispatchEvent(new Event("wearables:admin-data-changed"));
}
export async function saveFulfilment(
  order: OrderDetail,
  body: {
    status: string;
    reason: string;
    carrier?: string;
    trackingReference?: string;
    ownerNote?: string;
  },
) {
  return api<OrderDetail>(
    operationsPath(`orders/${encodeURIComponent(order.id)}/fulfilment`),
    {
      method: "POST",
      body: JSON.stringify({ ...body, expectedVersion: order.version }),
    },
  );
}
// Remove obsolete payment-key fields without discarding unrelated local settings.
export function clearLegacyPaymentKeys(
  storage: Pick<Storage, "getItem" | "setItem">,
) {
  const raw = storage.getItem("wa:settings");
  if (!raw) return;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const safe = { ...value } as Record<string, unknown>;
  delete safe.paystackSecretKey;
  delete safe.paystackPublicKey;
  storage.setItem("wa:settings", JSON.stringify(safe));
}
export function shippingFeeKobo(value: string) {
  if (!/^\d{1,17}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a fee in naira with up to two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result =
    BigInt(whole) * BigInt("100") + BigInt(fraction.padEnd(2, "0"));
  if (result > BigInt("9223372036854775807"))
    throw new Error("The delivery fee is too large.");
  return result.toString();
}
