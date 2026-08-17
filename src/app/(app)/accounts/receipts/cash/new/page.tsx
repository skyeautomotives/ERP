import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { ReceiptForm } from "../../receipt-form";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function NewCashReceiptPage() {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "create")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New cash receipt</h1>
        <HelpButton content={HELP_CONTENT["receipts"]} />
      </div>
      <div className="mt-6 max-w-3xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <ReceiptForm method="cash" customers={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))} />
      </div>
    </div>
  );
}
