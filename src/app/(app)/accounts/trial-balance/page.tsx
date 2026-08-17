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

export default async function TrialBalancePage({
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

  const totalDebit = rows.reduce((s, r) => s + Number(r.total_debit), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.total_credit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trial Balance</h1>
        <HelpButton content={HELP_CONTENT["trial-balance"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every account's total debits and credits, cumulative up to the date you pick. Total debits should always
        equal total credits.
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

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Debit</th>
              <th className="px-4 py-2 font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.account_id}>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.code}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {Number(r.total_debit) > 0 ? Number(r.total_debit).toFixed(2) : "-"}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {Number(r.total_credit) > 0 ? Number(r.total_credit).toFixed(2) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium text-gray-900 dark:text-gray-100">
            <tr>
              <td colSpan={2} className="px-4 py-2 text-right">
                Total
              </td>
              <td className="px-4 py-2">{totalDebit.toFixed(2)}</td>
              <td className="px-4 py-2">{totalCredit.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p
        className={`mt-3 text-sm font-medium ${
          balanced ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {balanced ? "Balanced - debits equal credits." : "Not balanced - this needs investigating."}
      </p>
    </div>
  );
}
