import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const STATUS_COLOR: Record<string, string> = {
  "0-15 days": "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  "16-30 days": "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400",
  "31-45 days": "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
  "46-60 days": "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400",
  "61-90 days": "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
  "90+ days": "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400",
};

type Row = {
  staff_name: string | null;
  customer_name: string | null;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  due_date: string | null;
  payment_date: string;
  collection_amount: number;
  days_taken: number;
  collection_status: string;
};

export default async function MyCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { from, to } = await searchParams;
  const fromDate = from || startOfMonthISO();
  const toDate = to || todayISO();
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_collection_detail", { p_from: fromDate, p_to: toDate });
  const rows = ((data ?? []) as Row[]).filter((r) => r.staff_name === user.fullName);
  const total = rows.reduce((s, r) => s + Number(r.collection_amount), 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Collections</h1>
        <HelpButton content={HELP_CONTENT["my-collections"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Every payment you've collected in this period.</p>

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

      <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total collected this period</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rs.{total.toFixed(2)}</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Invoice</th>
              <th className="px-4 py-2 font-medium">Invoice date</th>
              <th className="px-4 py-2 font-medium">Payment date</th>
              <th className="px-4 py-2 font-medium">Collected</th>
              <th className="px-4 py-2 font-medium">Days taken</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.customer_name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_number}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_date}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.payment_date}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.collection_amount).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.days_taken}</td>
                <td className="px-4 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[r.collection_status] ?? ""}`}>
                    {r.collection_status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No collections in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
