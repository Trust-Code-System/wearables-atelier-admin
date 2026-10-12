import { EditProductClient } from "./edit-client";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <EditProductClient id={id} />;
}
