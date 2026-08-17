import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { RecordHistory } from "@/components/record-history";
import { DeactivateButton } from "@/components/deactivate-button";
import { CustomerForm } from "../customer-form";
import { updateCustomer, setCustomerActive } from "../actions";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: customer }, { data: routes }, staff] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("routes").select("id, name").eq("is_active", true).order("name"),
    getStaffOptions(),
  ]);

  if (!customer) notFound();

  const boundUpdate = updateCustomer.bind(null, id);
  const canEdit = can(user, "masters", "edit");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{customer.name}</h1>
        {canEdit && (
          <DeactivateButton id={customer.id} isActive={customer.is_active} action={setCustomerActive} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 lg:col-span-2">
          <CustomerForm
            customer={customer}
            routes={(routes ?? []).map((r) => ({ id: r.id, label: r.name }))}
            staff={staff.map((s) => ({ id: s.id, label: s.full_name }))}
            action={boundUpdate}
            canEdit={canEdit}
          />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">History</h2>
          <RecordHistory table="customers" recordId={customer.id} />
        </div>
      </div>
    </div>
  );
}
