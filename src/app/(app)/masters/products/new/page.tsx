import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New product</h1>
      <div className="mt-6 max-w-3xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <ProductForm action={createProduct} canEdit />
      </div>
    </div>
  );
}
