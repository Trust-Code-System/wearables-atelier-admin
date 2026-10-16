import assert from "node:assert/strict";
import test from "node:test";
import { isAdminSession, safeAdminNext } from "../src/lib/admin-auth.ts";
test("admin session requires an admin or verified owner role and an unexpired session", () => {
  const session = {
    user: { role: "admin" },
    session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
  };
  assert.equal(isAdminSession(session), true);
  assert.equal(
    isAdminSession({ ...session, user: { role: "owner", emailVerified: true } }),
    true,
  );
  for (const input of [
    null,
    {},
    { ...session, user: { role: "customer" } },
    { ...session, user: { role: "staff", emailVerified: true } },
    { ...session, user: { role: "owner" } },
    { ...session, user: { role: "owner", emailVerified: false } },
    { ...session, user: { role: "owner", emailVerified: "true" } },
    { ...session, session: { expiresAt: new Date(0).toISOString() } },
    { ...session, session: { expiresAt: "invalid" } },
  ])
    assert.equal(isAdminSession(input), false);
});
test("login redirects stay inside admin routes", () => {
  assert.equal(
    safeAdminNext("/admin/products/new?source=login"),
    "/admin/products/new?source=login",
  );
  for (const input of [
    "https://evil.example.test",
    "//evil.example.test",
    "/admin/../../outside",
    "/administrator",
    "/admin\\evil",
    "/login",
    undefined,
  ])
    assert.equal(safeAdminNext(input), "/admin");
});
