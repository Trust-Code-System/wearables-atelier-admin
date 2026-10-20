"use client";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  ChartNoAxesCombinedIcon,
  PackageCheckIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AdminReportsProvider, useAdminReport } from "@/lib/admin-resource";
import {
  AdminCatalogProvider,
  useAdminCatalog as useCatalog,
} from "@/lib/admin-catalog";
import { storefrontHref } from "@/lib/storefront-url";
import { downloadCsv } from "@/lib/export-csv";
import { stockLevel } from "@/lib/admin-data";
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
  if (pathname.startsWith("/admin/inventory")) return "Inventory";
  if (pathname.startsWith("/admin/customers")) return "Customers";
  if (pathname.startsWith("/admin/analytics")) return "Analytics";
  return "Admin";
}

const PRODUCT_TABS = ["all", "clothing", "jewelry"];
const ORDER_TABS = [
  "all",
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
  "attention",
  "failed",
  "refunded",
];

function exportProductsCsv(
  products: ReturnType<typeof useCatalog>["products"],
) {
  downloadCsv("wearables-atelier-products.csv", [
    [
      "id",
      "name",
      "category",
      "size",
      "sku",
      "price_kobo",
      "compare_at_kobo",
      "status",
    ],
    ...products.flatMap((product) =>
      product.backend.variants.map((variant) => [
        product.id,
        product.name,
        product.category,
        variant.sizeLabel,
        variant.sku,
        variant.priceKobo,
        variant.compareAtPriceKobo ?? "",
        product.backend.status,
      ]),
    ),
  ]);
  toast.success("Catalog exported", {
    description: `${products.length} products saved as CSV.`,
  });
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { products } = useCatalog();
  const { data: report, owner } = useAdminReport();
  const { tab: storedTab, setTab, sort, setSort } = useAdminView();
  const { setTheme } = useTheme();

  const onProductsIndex = pathname === "/admin/products";
  const onOrdersIndex = pathname === "/admin/orders";
  const pendingCount = report?.current.pendingOrders ?? 0;

  const tab = (onProductsIndex ? PRODUCT_TABS : ORDER_TABS).includes(storedTab)
    ? storedTab
    : "all";
  const activeItemId =
    pathname === "/admin"
      ? "overview"
      : pathname.startsWith("/admin/products")
        ? "products"
        : pathname.split("/")[2] || "overview";

  return (
    <div className="admin-ui h-dvh" data-lenis-prevent>
      <DashboardShell
        brand={{
          name: "Wearables Atelier",
          description: "Admin portal",
          logo: (
            <span className="grid h-9 w-16 shrink-0 place-items-center rounded-lg bg-[#242920] px-1">
              <Image
                src="/brand/wearables-by-ashabi.png"
                alt="Wearables by Ashabi"
                width={844}
                height={351}
                sizes="56px"
                className="h-auto w-14"
              />
            </span>
          ),
        }}
        activeItemId={activeItemId}
        navigation={[
          {
            id: "manage",
            items: [
              {
                id: "overview",
                label: "Overview",
                icon: AppDots,
                href: "/admin",
              },
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
              {
                id: "inventory",
                label: "Inventory",
                icon: PackageCheckIcon,
                href: "/admin/inventory",
                count:
                  products.filter(
                    (product) => stockLevel(product.stock) !== "healthy",
                  ).length || undefined,
              },
              {
                id: "customers",
                label: "Customers",
                icon: UsersIcon,
                href: "/admin/customers",
                count: report?.current.customerRecords || undefined,
              },
              {
                id: "analytics",
                label: "Analytics",
                icon: ChartNoAxesCombinedIcon,
                href: "/admin/analytics",
              },
              {
                id: "settings",
                label: "Settings",
                icon: Settings2Icon,
                href: "/admin/settings",
              },
            ].filter(
              (item) =>
                owner ||
                !["orders", "customers", "analytics", "settings"].includes(
                  item.id,
                ),
            ),
          },
          {
            id: "storefront",
            title: "Storefront",
            items: [
              {
                id: "store",
                label: "View store",
                icon: AppWindowIcon,
                href: storefrontHref(),
                color: "#b3855a",
              },
              {
                id: "shop",
                label: "Shop page",
                icon: ShoppingBagIcon,
                href: storefrontHref("/shop"),
                color: "#8a8f6a",
              },
            ],
          },
        ]}
        title={titleFor(pathname)}
        status={
          pathname.startsWith("/admin/products") ? "Catalog" : "Live data"
        }
        statusTone="neutral"
        headerActions={
          <>
            <DashboardButton
              variant="secondary"
              size="icon"
              aria-label="Toggle dark mode"
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
            >
              <SunIcon aria-hidden className="hidden dark:block" />
              <MoonIcon aria-hidden className="dark:hidden" />
            </DashboardButton>
            <SignOutButton />
            <AdminSearch
              trigger={
                <DashboardButton
                  variant="secondary"
                  size="icon"
                  aria-label="Search products and orders (Ctrl+K)"
                >
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
                  { value: "fulfilled", label: "Delivered" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "attention", label: "Needs review" },
                  { value: "failed", label: "Failed" },
                  { value: "refunded", label: "Refunded" },
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

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminCatalogProvider>
      <AdminReportsProvider>
        <AdminViewProvider>
          <AdminShell>{children}</AdminShell>
        </AdminViewProvider>
      </AdminReportsProvider>
    </AdminCatalogProvider>
  );
}
