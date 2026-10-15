"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";
import {
  GemIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PackagePlusIcon,
  ReceiptTextIcon,
  StoreIcon,
  PackageCheckIcon,
  UsersIcon,
  ChartNoAxesCombinedIcon,
  Settings2Icon,
} from "lucide-react";
import { useOrders } from "@/lib/store";
import { useAdminCatalog as useCatalog } from "@/lib/admin-catalog";
import { storefrontHref } from "@/lib/storefront-url";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const PAGES = [
  { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/admin/products", label: "Products", icon: PackageIcon },
  { href: "/admin/products/new", label: "New product", icon: PackagePlusIcon },
  { href: "/admin/orders", label: "Orders", icon: ReceiptTextIcon },
  { href: "/admin/inventory", label: "Inventory", icon: PackageCheckIcon },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon },
  { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombinedIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings2Icon },
  { href: storefrontHref(), label: "Storefront", icon: StoreIcon },
];

export function AdminSearch({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { products } = useCatalog();
  const { orders } = useOrders();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    if (href.startsWith("http")) {
      window.location.assign(href);
      return;
    }
    router.push(href as never);
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, products, orders…" />
        <CommandList>
          <CommandEmpty>Nothing found. Try a different search.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((page) => (
              <CommandItem key={page.href} onSelect={() => go(page.href)}>
                <page.icon />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Products">
            {products.map((product) => (
              <CommandItem
                key={product.id}
                onSelect={() => go(`/admin/products/${product.id}`)}
              >
                <GemIcon />
                <span className="truncate">{product.name}</span>
                <span className="ml-auto text-[0.6875rem] text-muted-foreground capitalize">
                  {product.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Orders">
            {orders.slice(0, 5).map((order) => (
              <CommandItem key={order.id} onSelect={() => go("/admin/orders")}>
                <ReceiptTextIcon />
                <span className="tabular-nums">{order.reference}</span>
                <span className="ml-auto truncate text-[0.6875rem] text-muted-foreground">
                  {order.customer.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
