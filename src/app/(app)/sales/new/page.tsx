import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { getAllActiveProducts } from "@/lib/masters/all-products";
import { SalesInvoiceForm } from "../sales-invoice-form";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ImportOrdersButton } from "../import-orders-button";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) redirect("/unauthorized");

  const { type } = await searchParams;
  const initialSaleType = type === "cash" ? "cash" : "credit";

  const supabase = await createClient();
  const [{ data: customers }, { data: routes }, staff, products] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, route_id, assigned_user_id, credit_period_days")
      .eq("is_active", true)
      .order("name"),
    supabase.from("routes").select("id, name").eq("is_active", true).order("name"),
    getStaffOptions(),
    getAllActiveProducts("selling_rate"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New sale</h1>
          <HelpButton content={HELP_CONTENT["credit-sales"]} />
        </div>
        <ImportOrdersButton />
      </div>
      <div className="mt-6 max-w-4xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <SalesInvoiceForm
          initialSaleType={initialSaleType}
          customers={customers ?? []}
          routes={(routes ?? []).map((r) => ({ id: r.id, label: r.name }))}
          staff={staff.map((s) => ({ id: s.id, label: s.full_name }))}
          products={products}
        />
      </div>
    </div>
  );
}
