import assert from "node:assert/strict";
import test from "node:test";
import {
  customersFromOrders,
  salesSummary,
  ordersInRange,
  topSellingItems,
  toCsv,
  stockLevel,
  validStock,
} from "../src/lib/admin-data.ts";

function order(
  id,
  status,
  totalNGN,
  email = "customer@example.test",
  createdAt = "2026-10-12T12:00:00.000Z",
) {
  return {
    id,
    status,
    totalNGN,
    reference: id,
    createdAt,
    customer: { name: "Test Customer", email, phone: "+234000000000" },
    address: { line1: "Test address", city: "Lagos", state: "Lagos" },
    delivery: "standard",
    items: [
      {
        productId: "removed-product",
        name: "Order snapshot name",
        qty: 2,
        priceNGN: 500,
        size: null,
      },
    ],
  };
}

test("sales exclude unpaid and cancelled orders and use order totals", () => {
  const result = salesSummary([
    order("1", "paid", 1100),
    order("2", "fulfilled", 1300),
    order("3", "pending", 9000),
    order("4", "cancelled", 9000),
  ]);
  assert.equal(result.revenue, 2400);
  assert.equal(result.average, 1200);
  assert.equal(result.units, 4);
  assert.deepEqual(salesSummary([]), {
    sales: [],
    revenue: 0,
    average: 0,
    units: 0,
  });
});

test("customer grouping ignores email case and whitespace, keeping newest contact details", () => {
  const older = order(
    "1",
    "paid",
    1100,
    " Customer@example.test ",
    "2026-10-01T00:00:00Z",
  );
  const newer = order("2", "cancelled", 9999);
  newer.customer.name = "Updated Name";
  const customers = customersFromOrders([older, newer]);
  assert.equal(customers.length, 1);
  assert.equal(customers[0].name, "Updated Name");
  assert.equal(customers[0].orders[0].id, "2");
  assert.equal(customers[0].spent, 1100);
});

test("range boundaries are inclusive and one-sided ranges work", () => {
  const orders = [
    order("1", "paid", 1, "a", "2026-10-01T23:59:59Z"),
    order("2", "paid", 1, "b", "2026-10-12T00:00:00Z"),
    order("3", "paid", 1, "c", "2026-10-13T00:00:00Z"),
  ];
  assert.deepEqual(
    ordersInRange(orders, "2026-10-01", "2026-10-12").map((o) => o.id),
    ["1", "2"],
  );
  assert.equal(ordersInRange(orders, "", "2026-10-01").length, 1);
  assert.equal(ordersInRange(orders, "2026-10-13", "").length, 1);
});

test("product reports retain deleted products using captured item prices", () => {
  assert.deepEqual(
    topSellingItems([order("1", "paid", 1100), order("2", "pending", 1100)]),
    [
      {
        id: "removed-product",
        name: "Order snapshot name",
        units: 2,
        revenue: 1000,
      },
    ],
  );
});

test("CSV escapes multiline cells, quotes and spreadsheet formulas", () => {
  assert.equal(
    toCsv([["A, B", 'quote"here', "line\nbreak", "=SUM(A1)", "+234001", 10]]),
    '"A, B","quote""here","line\nbreak","\'=SUM(A1)","\'+234001",10',
  );
});

test("stock validation rejects negative, fractional and unsafe quantities", () => {
  for (const n of [-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(validStock(n), false);
  assert.equal(validStock(0), true);
  assert.equal(stockLevel(0), "out");
  assert.equal(stockLevel(8), "low");
  assert.equal(stockLevel(9), "healthy");
});
