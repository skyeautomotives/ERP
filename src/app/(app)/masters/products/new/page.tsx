import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">New product</h1>
      <div className="mt-6 max-w-3xl rounded-lg border border-gray-200 bg-white p-6">
        <ProductForm action={createProduct} canEdit />
      </div>
    </div>
  );
}
