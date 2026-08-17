import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { PurchaseInvoiceForm } from "../purchase-invoice-form";

export default async function NewPurchasePage() {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "create")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("products")
      .select("id, code, name, default_rate:purchase_rate, gst_percent")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New purchase</h1>
      <div className="mt-6 max-w-4xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <PurchaseInvoiceForm
          suppliers={(suppliers ?? []).map((s) => ({ id: s.id, label: s.name }))}
          products={products ?? []}
        />
      </div>
    </div>
  );
}
