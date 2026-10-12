import { ProductForm } from "../product-form";

export const metadata = { title: "New Product · Admin" };

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <p className="text-[0.8125rem] text-muted-foreground">
        Publish a piece to the storefront. It goes live immediately.
      </p>
      <ProductForm />
    </div>
  );
}
