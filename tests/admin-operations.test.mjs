import assert from "node:assert/strict";
import test from "node:test";
import { api } from "../src/lib/catalog-api.ts";
import {
  availableFulfilment,
  chartNaira,
  clearLegacyPaymentKeys,
  moneyKobo,
  operationsPath,
  saveFulfilment,
  shippingFeeKobo,
} from "../src/lib/admin-operations.ts";

test("operational money and delivery fees preserve kobo beyond safe floating point precision", () => {
  assert.equal(moneyKobo("9007199254740993"), "₦90,071,992,547,409.93");
  assert.equal(moneyKobo("-101"), "-₦1.01");
  assert.equal(moneyKobo("0"), "₦0.00");
  assert.equal(shippingFeeKobo("1500.05"), "150005");
  assert.equal(shippingFeeKobo("0"), "0");
  assert.equal(shippingFeeKobo("92233720368547758.07"), "9223372036854775807");
  assert.equal(chartNaira("9007199254740993"), null);
  assert.equal(chartNaira("105"), 1.05);
  for (const value of ["-1", "1.001", "1e3", "NaN", "92233720368547758.08"])
    assert.throws(() => shippingFeeKobo(value));
  assert.throws(() => moneyKobo("1.5"));
});

test("fulfilment choices require paid and settled stock and advance one stage at a time", () => {
  const order = {
    paymentStatus: "paid",
    payment: { allocationStatus: "settled" },
    fulfilmentStatus: "unfulfilled",
  };
  assert.deepEqual(availableFulfilment(order), ["processing"]);
  assert.deepEqual(
    availableFulfilment({ ...order, fulfilmentStatus: "processing" }),
    ["shipped"],
  );
  assert.deepEqual(
    availableFulfilment({ ...order, fulfilmentStatus: "shipped" }),
    ["delivered"],
  );
  for (const status of [
    "pending",
    "failed",
    "cancelled",
    "requires_review",
    "refunded",
    "partially_refunded",
  ])
    assert.deepEqual(
      availableFulfilment({ ...order, paymentStatus: status }),
      [],
    );
  for (const status of ["delivered", "cancelled"])
    assert.deepEqual(
      availableFulfilment({ ...order, fulfilmentStatus: status }),
      [],
    );
  assert.deepEqual(
    availableFulfilment({
      ...order,
      payment: { allocationStatus: "reserved" },
    }),
    [],
  );
});

test("fulfilment transport submits the captured version and no financial status mutation", async () => {
  const original = globalThis.fetch,
    env = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return Response.json({ id: "order" });
  };
  try {
    await saveFulfilment(
      { id: "order", version: 7 },
      {
        status: "shipped",
        reason: "Handed to carrier",
        carrier: "Courier",
        trackingReference: "TRACK-1",
      },
    );
    assert.equal(
      call.url,
      "http://localhost:3000/api/v1/admin/orders/order/fulfilment",
    );
    assert.equal(call.options.credentials, "include");
    assert.equal(call.options.cache, "no-store");
    assert.equal(call.options.method, "POST");
    assert.deepEqual(JSON.parse(call.options.body), {
      status: "shipped",
      reason: "Handed to carrier",
      carrier: "Courier",
      trackingReference: "TRACK-1",
      expectedVersion: 7,
    });
  } finally {
    globalThis.fetch = original;
    if (env === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = env;
  }
});

test("obsolete browser payment keys are scrubbed while unrelated preferences survive", () => {
  let stored = JSON.stringify({
    paystackSecretKey: "obsolete-secret",
    paystackPublicKey: "obsolete-public",
    brandName: "Wearables",
    theme: "dark",
  });
  clearLegacyPaymentKeys({
    getItem: (key) => {
      assert.equal(key, "wa:settings");
      return stored;
    },
    setItem: (key, value) => {
      assert.equal(key, "wa:settings");
      stored = value;
    },
  });
  assert.deepEqual(JSON.parse(stored), {
    brandName: "Wearables",
    theme: "dark",
  });
});

test("customer search text is encoded as data and optional cursor is omitted", () => {
  const path = operationsPath("customers", {
    q: "name&kind=profile",
    kind: "guest_order",
    cursor: undefined,
  });
  const url = new URL(path, "https://admin.example.test");
  assert.equal(url.searchParams.get("q"), "name&kind=profile");
  assert.equal(url.searchParams.get("kind"), "guest_order");
  assert.equal(url.searchParams.has("cursor"), false);
});

test("owner permission denial preserves the login session; expiry invalidates it", async () => {
  const previousFetch = globalThis.fetch,
    previousWindow = globalThis.window;
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const events = [];
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  try {
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(
      api("/api/v1/admin/customers"),
      (error) => error.status === 403,
    );
    assert.deepEqual(events, []);
    globalThis.fetch = async () => new Response(null, { status: 401 });
    await assert.rejects(
      api("/api/v1/admin/customers"),
      (error) => error.status === 401,
    );
    assert.deepEqual(events, ["wearables:session-invalid"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl;
  }
});
