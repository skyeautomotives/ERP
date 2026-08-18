import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const todayISO = () => new Date().toISOString().slice(0, 10);

// See the matching comment in accounts/customer-ledger/page.tsx - the running
// balance depends on every prior row, so this caps what's rendered rather than
// pushing pagination into the RPC.
const MAX_DISPLAY_ROWS = 200;

type LedgerRow = {
  txn_date: string;
  particulars: string;
  ref_type: string;
  ref_id: string;
  billed: number;
  paid: number;
  running_balance: number;
};

export default async function SupplierLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; asOf?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { supplierId, asOf } = await searchParams;
  const asOfDate = asOf || todayISO();
  const supabase = await createClient();

  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");

  let rows: LedgerRow[] = [];
  if (supplierId) {
    const { data } = await supabase.rpc("get_supplier_ledger", {
      p_supplier_id: supplierId,
      p_as_of_date: asOfDate,
    });
    rows = (data ?? []) as LedgerRow[];
  }

  const closingBalance = rows.length > 0 ? rows[rows.length - 1].running_balance : 0;
  const selectedSupplier = suppliers?.find((s) => s.id === supplierId);
  const truncated = rows.length > MAX_DISPLAY_ROWS;
  const displayRows = truncated ? rows.slice(-MAX_DISPLAY_ROWS) : rows;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Supplier Ledger</h1>
        <HelpButton content={HELP_CONTENT["supplier-ledger"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every purchase and payment for one supplier, with a running balance.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier</label>
          <select
            name="supplierId"
            defaultValue={supplierId ?? ""}
            className="w-64 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Select supplier...</option>
            {(suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
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
          Show ledger
        </button>
      </form>

      {supplierId && (
        <>
          <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Balance as of {asOfDate} for {selectedSupplier?.name ?? "this supplier"}
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Rs.{closingBalance.toFixed(2)} {closingBalance >= 0 ? "(you owe them)" : "(they owe you)"}
            </p>
          </div>

          {truncated && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              Showing the most recent {MAX_DISPLAY_ROWS} of {rows.length} transactions up to {asOfDate}. Pick an
              earlier "As of" date to see an earlier period.
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Particulars</th>
                  <th className="px-4 py-2 font-medium">Billed</th>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {displayRows.map((r, i) => (
                  <tr key={`${r.ref_type}-${r.ref_id}-${i}`}>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.txn_date}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.particulars}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {Number(r.billed) > 0 ? Number(r.billed).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {Number(r.paid) > 0 ? Number(r.paid).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {Number(r.running_balance).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      No activity for this supplier yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
