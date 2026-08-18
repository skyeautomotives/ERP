import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { RecordHistory } from "@/components/record-history";
import { DeactivateButton } from "@/components/deactivate-button";
import { ConfirmButton } from "@/components/confirm-button";
import { ProductForm } from "../product-form";
import { updateProduct, setProductActive, deleteProduct } from "../actions";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", id).single();

  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, id);
  const canEdit = can(user, "masters", "edit");
  const canDelete = can(user, "masters", "delete");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{product.name}</h1>
        <div className="flex gap-2">
          {canEdit && (
            <DeactivateButton id={product.id} isActive={product.is_active} action={setProductActive} />
          )}
          {canDelete && (
            <ConfirmButton
              id={product.id}
              label="Delete"
              confirmTitle="Delete this product?"
              confirmBody="This permanently removes the product. If it has any purchases, sales, or stock movement, the delete will be blocked - deactivate it instead in that case."
              confirmLabel="Delete product"
              action={deleteProduct}
              redirectTo="/masters/products"
            />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 lg:col-span-2">
          <ProductForm product={product} action={boundUpdate} canEdit={canEdit} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Price / edit history</h2>
          <RecordHistory table="products" recordId={product.id} />
        </div>
      </div>
    </div>
  );
}
