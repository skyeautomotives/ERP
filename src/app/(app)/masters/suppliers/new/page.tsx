import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SupplierForm } from "../supplier-form";
import { createSupplier } from "../actions";

export default async function NewSupplierPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">New supplier</h1>
      <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <SupplierForm action={createSupplier} canEdit />
      </div>
    </div>
  );
}
