import { LiveOrderDetail } from "@/components/admin/live-order-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LiveOrderDetail id={(await params).id} />;
}
