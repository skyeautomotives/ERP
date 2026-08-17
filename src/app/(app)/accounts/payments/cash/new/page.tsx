import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { PaymentForm } from "../../payment-form";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function NewCashPaymentPage() {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "create")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: suppliers }, { data: categories }] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("expense_categories").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New cash payment</h1>
        <HelpButton content={HELP_CONTENT["payments"]} />
      </div>
      <div className="mt-6 max-w-3xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <PaymentForm
          method="cash"
          suppliers={(suppliers ?? []).map((s) => ({ id: s.id, label: s.name }))}
          expenseCategories={(categories ?? []).map((c) => ({ id: c.id, label: c.name }))}
        />
      </div>
    </div>
  );
}
