import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

export default async function ChartOfAccountsPage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: balances } = await supabase.rpc("get_account_balances", {});

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chart of Accounts</h1>
        <HelpButton content={HELP_CONTENT["chart-of-accounts"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The accounts every transaction posts to automatically. Current balance is cumulative to today.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(balances ?? []).map((a) => (
              <tr key={a.account_id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{a.code}</td>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{a.name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{TYPE_LABELS[a.account_type ?? ""] ?? a.account_type}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">Rs.{Number(a.balance ?? 0).toFixed(2)}</td>
              </tr>
            ))}
            {(!balances || balances.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
