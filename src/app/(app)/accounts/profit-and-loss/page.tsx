import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ModuleTabs } from "@/components/module-tabs";
import { ACCOUNTS_TABS } from "../accounts-tabs";

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

type BalanceRow = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
};

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { from, to } = await searchParams;
  const fromDate = from || firstOfMonthISO();
  const toDate = to || todayISO();
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_account_balances", { p_from_date: fromDate, p_to_date: toDate });
  const rows = (data ?? []) as BalanceRow[];

  const incomeRows = rows.filter((r) => r.account_type === "income").map((r) => ({ ...r, amount: -Number(r.balance) }));
  const expenseRows = rows.filter((r) => r.account_type === "expense").map((r) => ({ ...r, amount: Number(r.balance) }));

  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div>
      <ModuleTabs tabs={ACCOUNTS_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profit &amp; Loss</h1>
        <HelpButton content={HELP_CONTENT["profit-and-loss"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Income and expenses for the period you pick, and what's left over.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromDate}
            max={todayISO()}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toDate}
            max={todayISO()}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <p className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Income
          </p>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {incomeRows.map((r) => (
                <tr key={r.account_id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{r.amount.toFixed(2)}</td>
                </tr>
              ))}
              {incomeRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-gray-400 dark:text-gray-500">
                    No income in this period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
              <tr>
                <td className="px-4 py-2">Total income</td>
                <td className="px-4 py-2 text-right">{totalIncome.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <p className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Expenses
          </p>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {expenseRows.map((r) => (
                <tr key={r.account_id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{r.amount.toFixed(2)}</td>
                </tr>
              ))}
              {expenseRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-gray-400 dark:text-gray-500">
                    No expenses in this period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
              <tr>
                <td className="px-4 py-2">Total expenses</td>
                <td className="px-4 py-2 text-right">{totalExpense.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Net profit for {fromDate} to {toDate}</p>
        <p
          className={`text-xl font-semibold ${
            netProfit >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
          }`}
        >
          Rs.{netProfit.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
