import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { SalesOrderForm } from "../sales-order-form";

export default async function NewSalesOrderPage() {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: customers }, { data: routes }, staff, { data: products }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, route_id, assigned_user_id")
      .eq("is_active", true)
      .order("name"),
    supabase.from("routes").select("id, name").eq("is_active", true).order("name"),
    getStaffOptions(),
    supabase
      .from("products")
      .select("id, code, name, default_rate:selling_rate, gst_percent")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New sales order</h1>
      <div className="mt-6 max-w-4xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <SalesOrderForm
          customers={customers ?? []}
          routes={(routes ?? []).map((r) => ({ id: r.id, label: r.name }))}
          staff={staff.map((s) => ({ id: s.id, label: s.full_name }))}
          products={products ?? []}
        />
      </div>
    </div>
  );
}
