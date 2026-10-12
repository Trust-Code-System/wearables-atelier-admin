"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { AppDots, Box } from "@duo-icons/react";
import {
  AppWindowIcon,
  DownloadIcon,
  MoonIcon,
  PlusIcon,
  ReceiptTextIcon,
  SearchIcon,
  Settings2Icon,
  ShoppingBagIcon,
  SunIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCatalog, useOrders } from "@/lib/store";
import { storefrontHref } from "@/lib/storefront-url";
import { AdminSearch } from "@/components/admin/admin-search";
import {
  AdminViewProvider,
  useAdminView,
} from "@/components/admin/admin-view-context";
import {
  DashboardButton,
  DashboardFilterMenu,
  DashboardShell,
} from "@/components/block/dashboard-shell";
import "./admin.css";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock", label: "Lowest stock" },
];

function titleFor(pathname: string): string {
  if (pathname === "/admin") return "Overview";
  if (pathname === "/admin/products") return "Products";
  if (pathname === "/admin/products/new") return "New product";
  if (pathname.startsWith("/admin/products/")) return "Edit product";
  if (pathname.startsWith("/admin/orders")) return "Orders";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  return "Admin";
}

const PRODUCT_TABS = ["all", "clothing", "jewelry"];
const ORDER_TABS = ["all", "pending", "paid", "fulfilled", "cancelled"];

function exportProductsCsv(products: ReturnType<typeof useCatalog>["products"]) {
  const header = "id,name,category,price_ngn,compare_at_ngn,stock,sizes,badge";
  const rows = products.map((p) =>
    [
      p.id,
      `"${p.name.replaceAll('"', '""')}"`,
      p.category,
      p.priceNGN,
      p.compareAtNGN ?? "",
      p.stock,
      `"${p.sizes.join(" ") || "one-size"}"`,
      p.badge ?? "",
    ].join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wearables-atelier-products.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Catalog exported", {
    description: `${products.length} products saved as CSV.`,
  });
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { products } = useCatalog();
  const { orders } = useOrders();
  const { tab: storedTab, setTab, sort, setSort } = useAdminView();
  const [dark, setDark] = useState(true);

  const onProductsIndex = pathname === "/admin/products";
  const onOrdersIndex = pathname === "/admin/orders";
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const tab = (onProductsIndex ? PRODUCT_TABS : ORDER_TABS).includes(storedTab)
    ? storedTab
    : "all";
  const activeItemId = pathname === "/admin"
    ? "overview"
    : pathname.startsWith("/admin/products")
      ? "products"
      : pathname.startsWith("/admin/orders") ? "orders" : "settings";

  return (
    <div className={`admin-ui h-dvh ${dark ? "dark" : ""}`} data-lenis-prevent>
    <DashboardShell
      brand={{
        name: "Wearables Atelier",
        description: "Admin portal",
        logo: <span className="grid h-9 w-16 shrink-0 place-items-center rounded-lg bg-[#242920] px-1"><Image src="/brand/wearables-by-ashabi.png" alt="Wearables by Ashabi" width={844} height={351} sizes="56px" className="h-auto w-14" /></span>,
      }}
      activeItemId={activeItemId}
      navigation={[
        {
          id: "manage",
          items: [
            { id: "overview", label: "Overview", icon: AppDots, href: "/admin" },
            {
              id: "products",
              label: "Products",
              icon: Box,
              href: "/admin/products",
              count: products.length,
            },
            {
              id: "orders",
              label: "Orders",
              icon: ReceiptTextIcon,
              href: "/admin/orders",
              count: pendingCount > 0 ? pendingCount : undefined,
            },
            { id: "settings", label: "Settings", icon: Settings2Icon, href: "/admin/settings" },
          ],
        },
        {
          id: "storefront",
          title: "Storefront",
          items: [
            { id: "store", label: "View store", icon: AppWindowIcon, href: storefrontHref(), color: "#b3855a" },
            { id: "shop", label: "Shop page", icon: ShoppingBagIcon, href: storefrontHref("/shop"), color: "#8a8f6a" },
          ],
        },
      ]}
      title={titleFor(pathname)}
      status="Live"
      headerActions={
        <>
        <DashboardButton variant="secondary" size="icon" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark((value) => !value)}>
          {dark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
        </DashboardButton>
        <AdminSearch
          trigger={
            <DashboardButton variant="secondary" size="icon" aria-label="Search products and orders (Ctrl+K)">
              <SearchIcon aria-hidden />
            </DashboardButton>
          }
        />
        </>
      }
      tabs={
        onProductsIndex
          ? [
              { value: "all", label: "All products" },
              { value: "clothing", label: "Clothing" },
              { value: "jewelry", label: "Jewelry" },
            ]
          : onOrdersIndex
            ? [
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "fulfilled", label: "Fulfilled" },
                { value: "cancelled", label: "Cancelled" },
              ]
            : undefined
      }
      tab={onProductsIndex || onOrdersIndex ? tab : undefined}
      onTabChange={onProductsIndex || onOrdersIndex ? setTab : undefined}
      filters={
        onProductsIndex ? (
          <DashboardFilterMenu
            label="Sort by"
            value={sort}
            options={SORT_OPTIONS}
            onValueChange={setSort}
          />
        ) : undefined
      }
      toolbarActions={
        onProductsIndex ? (
          <>
            <DashboardButton
              variant="secondary"
              size="sm"
              onClick={() => exportProductsCsv(products)}
            >
              <DownloadIcon aria-hidden />
              Export
            </DashboardButton>
            <DashboardButton
              variant="primary"
              size="sm"
              onClick={() => router.push("/admin/products/new")}
            >
              <PlusIcon aria-hidden />
              New product
            </DashboardButton>
          </>
        ) : undefined
      }
    >
      {children}
    </DashboardShell>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminViewProvider>
      <AdminShell>{children}</AdminShell>
    </AdminViewProvider>
  );
}
