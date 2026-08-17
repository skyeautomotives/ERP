import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

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
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New customer</h1>
        <HelpButton content={HELP_CONTENT["customers"]} />
      </div>
      <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
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
