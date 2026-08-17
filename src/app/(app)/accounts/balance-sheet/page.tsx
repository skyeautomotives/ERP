import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const todayISO = () => new Date().toISOString().slice(0, 10);

type BalanceRow = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
};

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { asOf } = await searchParams;
  const asOfDate = asOf || todayISO();
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_account_balances", { p_to_date: asOfDate });
  const rows = (data ?? []) as BalanceRow[];

  const assetRows = rows.filter((r) => r.account_type === "asset").map((r) => ({ ...r, amount: Number(r.balance) }));
  const liabilityRows = rows.filter((r) => r.account_type === "liability").map((r) => ({ ...r, amount: -Number(r.balance) }));
  const equityRows = rows.filter((r) => r.account_type === "equity").map((r) => ({ ...r, amount: -Number(r.balance) }));

  const totalIncome = rows.filter((r) => r.account_type === "income").reduce((s, r) => s - Number(r.balance), 0);
  const totalExpense = rows.filter((r) => r.account_type === "expense").reduce((s, r) => s + Number(r.balance), 0);
  const currentEarnings = totalIncome - totalExpense;

  const totalAssets = assetRows.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilityRows.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equityRows.reduce((s, r) => s + r.amount, 0) + currentEarnings;
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Balance Sheet</h1>
        <HelpButton content={HELP_CONTENT["balance-sheet"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        What the business owns, owes, and is worth, as of the date you pick.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">As of date</label>
          <input
            type="date"
            name="asOf"
            defaultValue={asOfDate}
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
            Assets
          </p>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {assetRows.map((r) => (
                <tr key={r.account_id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{r.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
              <tr>
                <td className="px-4 py-2">Total assets</td>
                <td className="px-4 py-2 text-right">{totalAssets.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <p className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Liabilities
            </p>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {liabilityRows.map((r) => (
                  <tr key={r.account_id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{r.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
                <tr>
                  <td className="px-4 py-2">Total liabilities</td>
                  <td className="px-4 py-2 text-right">{totalLiabilities.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <p className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Equity
            </p>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {equityRows.map((r) => (
                  <tr key={r.account_id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{r.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">Current Earnings</td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">{currentEarnings.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
                <tr>
                  <td className="px-4 py-2">Total equity</td>
                  <td className="px-4 py-2 text-right">{totalEquity.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-medium ${
          balanced ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {balanced
          ? `Balanced - Assets (Rs.${totalAssets.toFixed(2)}) = Liabilities + Equity (Rs.${(totalLiabilities + totalEquity).toFixed(2)}).`
          : "Not balanced - this needs investigating."}
      </p>
    </div>
  );
}
