import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SupplierForm } from "../supplier-form";
import { createSupplier } from "../actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function NewSupplierPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New supplier</h1>
        <HelpButton content={HELP_CONTENT["suppliers"]} />
      </div>
      <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <SupplierForm action={createSupplier} canEdit />
      </div>
    </div>
  );
}
