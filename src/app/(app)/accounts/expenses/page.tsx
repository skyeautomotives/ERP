import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("payments")
    .select("id, payment_number, payment_date, amount, method, status, paid_to, expense_categories(name)")
    .eq("purpose", "expense")
    .order("payment_date", { ascending: false });

  const activeExpenses = (expenses ?? []).filter((e) => e.status === "active");
  const total = activeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = new Map<string, number>();
  for (const e of activeExpenses) {
    const key = e.expense_categories?.name ?? "Uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount));
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expenses</h1>
        <HelpButton content={HELP_CONTENT["expenses"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every expense recorded through Cash Payment or Bank Payment.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total expenses</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rs.{total.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">By category</p>
          <div className="space-y-1 text-sm">
            {Array.from(byCategory.entries()).map(([name, amount]) => (
              <div key={name} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{name}</span>
                <span className="text-gray-900 dark:text-gray-100">{amount.toFixed(2)}</span>
              </div>
            ))}
            {byCategory.size === 0 && <p className="text-gray-400 dark:text-gray-500">No expenses yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Payment #</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Paid to</th>
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(expenses ?? []).map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{e.payment_number}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.expense_categories?.name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.paid_to ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{e.method}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.payment_date}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(e.amount).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      e.status === "active"
                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!expenses || expenses.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
