import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { AdjustmentForm } from "./adjustment-form";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ModuleTabs } from "@/components/module-tabs";
import { INVENTORY_TABS } from "../inventory-tabs";

export default async function StockAdjustmentsPage() {
  const user = await getCurrentUser();
  if (!can(user, "inventory", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: products }, { data: adjustments }] = await Promise.all([
    supabase.from("products").select("id, code, name").eq("is_active", true).order("name"),
    supabase
      .from("stock_adjustments")
      .select("id, quantity_change, reason, notes, created_at, products(code, name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div>
      <ModuleTabs tabs={INVENTORY_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Adjustment</h1>
        <HelpButton content={HELP_CONTENT["stock-adjustments"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Correct stock counts by hand - damage, loss, physical recount, or anything else that isn&apos;t a
        purchase or sale. To fix a mistaken adjustment, enter another one that offsets it.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          {can(user, "inventory", "create") ? (
            <AdjustmentForm products={(products ?? []).map((p) => ({ id: p.id, label: `${p.code} - ${p.name}` }))} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You don&apos;t have permission to record stock adjustments.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Change</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(adjustments ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {a.products?.code} - {a.products?.name}
                  </td>
                  <td
                    className={
                      Number(a.quantity_change) < 0
                        ? "px-4 py-2 text-red-600 dark:text-red-400"
                        : "px-4 py-2 text-green-600 dark:text-green-400"
                    }
                  >
                    {Number(a.quantity_change) > 0 ? "+" : ""}
                    {a.quantity_change}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{a.reason}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!adjustments || adjustments.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                    No adjustments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
