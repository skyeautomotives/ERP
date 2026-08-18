import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { RealtimeRefresh } from "@/components/realtime-refresh";

const todayISO = () => new Date().toISOString().slice(0, 10);

// The running balance the RPC computes for each row depends on every row before
// it, so this can't be paginated server-side without the RPC itself computing an
// opening balance carried forward - not worth the correctness risk to an already-
// verified money-critical function for what's normally a small per-customer volume.
// Instead, cap what's rendered (not what's computed) so one very long-lived
// customer's ledger can't produce an unbounded page.
const MAX_DISPLAY_ROWS = 200;

type LedgerRow = {
  txn_date: string;
  particulars: string;
  ref_type: string;
  ref_id: string;
  billed: number;
  received: number;
  running_balance: number;
};

export default async function CustomerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; asOf?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "view")) redirect("/unauthorized");

  const { customerId, asOf } = await searchParams;
  const asOfDate = asOf || todayISO();
  const supabase = await createClient();

  const { data: customers } = await supabase.from("customers").select("id, name").order("name");

  let rows: LedgerRow[] = [];
  if (customerId) {
    const { data } = await supabase.rpc("get_customer_ledger", {
      p_customer_id: customerId,
      p_as_of_date: asOfDate,
    });
    rows = (data ?? []) as LedgerRow[];
  }

  const closingBalance = rows.length > 0 ? rows[rows.length - 1].running_balance : 0;
  const selectedCustomer = customers?.find((c) => c.id === customerId);
  const truncated = rows.length > MAX_DISPLAY_ROWS;
  const displayRows = truncated ? rows.slice(-MAX_DISPLAY_ROWS) : rows;

  return (
    <div>
      <RealtimeRefresh tables={["sales_invoices", "receipts", "receipt_allocations"]} />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customer Ledger</h1>
        <HelpButton content={HELP_CONTENT["customer-ledger"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Every sales invoice and receipt for one customer, with a running balance.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Customer</label>
          <select
            name="customerId"
            defaultValue={customerId ?? ""}
            className="w-64 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Select customer...</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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

      {customerId && (
        <>
          <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Balance as of {asOfDate} for {selectedCustomer?.name ?? "this customer"}
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Rs.{closingBalance.toFixed(2)} {closingBalance >= 0 ? "(they owe you)" : "(you owe them)"}
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
                  <th className="px-4 py-2 font-medium">Received</th>
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
                      {Number(r.received) > 0 ? Number(r.received).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {Number(r.running_balance).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      No activity for this customer yet.
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
