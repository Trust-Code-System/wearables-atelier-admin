import type { Order, OrderStatus } from "./types";

export const LOW_STOCK_THRESHOLD = 8;
export const isRecognizedSale = (order: Order) =>
  order.status === "paid" || order.status === "fulfilled";
export const stockLevel = (stock: number) =>
  stock <= 0 ? "out" : stock <= LOW_STOCK_THRESHOLD ? "low" : "healthy";
export const validStock = (stock: number) =>
  Number.isSafeInteger(stock) && stock >= 0;

export function salesSummary(orders: Order[]) {
  const sales = orders.filter(isRecognizedSale);
  const revenue = sales.reduce((sum, order) => sum + order.totalNGN, 0);
  return {
    sales,
    revenue,
    average: sales.length ? revenue / sales.length : 0,
    units: sales.reduce(
      (sum, order) => sum + order.items.reduce((n, item) => n + item.qty, 0),
      0,
    ),
  };
}

export function customerKey(order: Order) {
  return (
    order.customer.email.trim().toLowerCase() ||
    order.customer.phone.trim() ||
    order.id
  );
}

export function customersFromOrders(orders: Order[]) {
  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const key = customerKey(order);
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  return [...groups]
    .map(([key, history]) => {
      const sorted = [...history].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const latest = sorted[0];
      return {
        key,
        ...latest.customer,
        location: `${latest.address.city}, ${latest.address.state}`,
        orders: sorted,
        spent: salesSummary(sorted).revenue,
        lastOrder: latest.createdAt,
      };
    })
    .sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
}

export function ordersInRange(orders: Order[], start: string, end: string) {
  return orders.filter((order) => {
    const date = order.createdAt.slice(0, 10);
    return (!start || date >= start) && (!end || date <= end);
  });
}

export function topSellingItems(orders: Order[]) {
  const tally = new Map<
    string,
    { id: string; name: string; units: number; revenue: number }
  >();
  for (const order of orders.filter(isRecognizedSale)) {
    for (const item of order.items) {
      const row = tally.get(item.productId) ?? {
        id: item.productId,
        name: item.name,
        units: 0,
        revenue: 0,
      };
      row.units += item.qty;
      row.revenue += item.priceNGN * item.qty;
      tally.set(item.productId, row);
    }
  }
  return [...tally.values()].sort((a, b) => b.revenue - a.revenue);
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
];

// Keep customer-controlled cells from being interpreted as spreadsheet formulas.
export function csvCell(value: string | number) {
  if (typeof value === "number") return String(value);
  const safe =
    /^[\s]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value)
      ? `'${value}`
      : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows: (string | number)[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
