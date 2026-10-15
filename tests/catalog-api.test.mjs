import assert from "node:assert/strict";
import test from "node:test";
import {
  nairaToKobo,
  displayKobo,
  api,
  uploadImage,
} from "../src/lib/catalog-api.ts";

test("money conversion preserves kobo without floating point rounding", () => {
  assert.equal(nairaToKobo("185000.05"), "18500005");
  assert.equal(nairaToKobo("0.01"), "1");
  assert.equal(displayKobo("18500005"), "₦185,000.05");
  for (const value of ["0", "-1", "1.005", "NaN", "1e3"])
    assert.throws(() => nairaToKobo(value));
});

test("browser uploads send API cookies only to API and file bytes only to storage", async () => {
  const previous = globalThis.fetch;
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1)
      return Response.json({
        storageKey: "pending/test/test.png",
        uploadUrl: "https://storage.example.test/upload",
        method: "PUT",
        headers: { "Content-Type": "image/png" },
      });
    if (calls.length === 2) return new Response(null, { status: 200 });
    return Response.json({ id: "product", images: [] });
  };
  try {
    const file = new File([new Uint8Array([1, 2])], "image.png", {
      type: "image/png",
    });
    await uploadImage("product", file, "Front view");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[1].options.credentials, "omit");
    assert.equal(calls[1].options.body, file);
    assert.equal(calls[2].options.credentials, "include");
    assert.deepEqual(JSON.parse(calls[2].options.body), {
      storageKey: "pending/test/test.png",
      altText: "Front view",
    });
    calls.length = 0;
    await assert.rejects(
      uploadImage(
        "product",
        new File(["text"], "bad.txt", { type: "text/plain" }),
        "Bad",
      ),
    );
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = previous;
    if (env === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = env;
  }
});

test("expired API sessions return an actionable authentication error", async () => {
  const previous = globalThis.fetch;
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  globalThis.fetch = async () => new Response(null, { status: 401 });
  try {
    await assert.rejects(
      api("/api/v1/admin/products"),
      (error) => error.status === 401,
    );
  } finally {
    globalThis.fetch = previous;
    if (env === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = env;
  }
});

test("save draft allows no images; publishing happens after image attachment", async () => {
  const { saveCatalogProduct } = await import("../src/lib/catalog-api.ts");
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const requests = [];
  let product = {
    id: "test-product",
    name: "Lime Set",
    slug: "lime-set",
    status: "DRAFT",
    updatedAt: "2026-10-15T12:00:00.000Z",
    images: [],
    variants: [],
  };
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    requests.push([options.method ?? "GET", path]);
    if (path === "/api/v1/admin/media/uploads")
      return Response.json({
        storageKey: "pending/test/image.png",
        uploadUrl: "https://storage.example.test/upload",
        method: "PUT",
        headers: { "Content-Type": "image/png" },
      });
    if (path === "/upload") return new Response(null, { status: 200 });
    if (path.endsWith("/images")) {
      product = { ...product, images: [{ id: "image-id", position: 0 }] };
      return Response.json(product);
    }
    if (path.endsWith("/status")) {
      assert.equal(product.images.length, 1);
      product = { ...product, status: JSON.parse(options.body).status };
      return Response.json(product);
    }
    return Response.json(product);
  };
  const input = {
    name: "Lime Set",
    slug: "lime-set",
    category: "CLOTHING",
    description: "Lime set",
    careDetails: [],
    variants: [],
  };
  const hooks = {
    onCreated() {},
    onSaved() {},
    onUploaded() {},
    onProgress() {},
  };
  try {
    const draft = await saveCatalogProduct({
      input,
      previous: null,
      status: "DRAFT",
      files: [],
      uploadOffset: 0,
      ...hooks,
    });
    assert.equal(draft.status, "DRAFT");
    assert.deepEqual(
      requests.map(([method]) => method),
      ["POST", "GET"],
    );
    requests.length = 0;
    const file = new File([new Uint8Array([1, 2])], "image.png", {
      type: "image/png",
    });
    const published = await saveCatalogProduct({
      input,
      previous: draft,
      status: "PUBLISHED",
      files: [file],
      uploadOffset: 0,
      ...hooks,
    });
    assert.equal(published.status, "PUBLISHED");
    assert.deepEqual(requests.slice(-2), [
      ["POST", "/api/v1/admin/products/test-product/images"],
      ["PATCH", "/api/v1/admin/products/test-product/status"],
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = originalUrl;
  }
});
