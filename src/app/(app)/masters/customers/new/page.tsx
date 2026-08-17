import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: routes }, staff] = await Promise.all([
    supabase.from("routes").select("id, name").eq("is_active", true).order("name"),
    getStaffOptions(),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">New customer</h1>
      <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        <CustomerForm
          routes={(routes ?? []).map((r) => ({ id: r.id, label: r.name }))}
          staff={staff.map((s) => ({ id: s.id, label: s.full_name }))}
          action={createCustomer}
          canEdit
        />
      </div>
    </div>
  );
}
