import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { RealtimeRefresh } from "@/components/realtime-refresh";

const PROFIT_VISIBLE_ROLES = ["Admin", "Accountant", "Management"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return monday.toISOString().slice(0, 10);
};
const startOfMonthISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

type StaffRow = {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  credit_sales: number;
  invoice_count: number;
  customer_count: number;
  total_collection: number;
  total_outstanding: number;
  sales_return_total: number;
  profit_total: number;
  collected_0_15: number;
  collected_16_30: number;
  collected_31_45: number;
  collected_46_60: number;
  collected_61_90: number;
  collected_90_plus: number;
};

export default async function StaffPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "staff", "view")) redirect("/unauthorized");

  const { from, to } = await searchParams;
  const fromDate = from || startOfMonthISO();
  const toDate = to || todayISO();
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_staff_performance", { p_from: fromDate, p_to: toDate });
  const rows = (data ?? []) as StaffRow[];
  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;

  const qs = (f: string, t: string) => `?from=${f}&to=${t}`;

  return (
    <div>
      <RealtimeRefresh tables={["sales_invoices", "receipts", "receipt_allocations"]} />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Staff Performance</h1>
        <HelpButton content={HELP_CONTENT["staff-performance"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Sales, collection, and outstanding for every staff member over a period, with a breakdown of how quickly
        their credit sales get collected.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={qs(todayISO(), todayISO())} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">Today</Link>
        <Link href={qs(startOfWeekISO(), todayISO())} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">This Week</Link>
        <Link href={qs(startOfMonthISO(), todayISO())} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">This Month</Link>
      </div>

      <form className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
          <input type="date" name="from" defaultValue={fromDate} max={todayISO()} className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
          <input type="date" name="to" defaultValue={toDate} max={todayISO()} className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100" />
        </div>
        <button type="submit" className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Apply</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Staff</th>
              <th className="px-4 py-2 font-medium">Invoices</th>
              <th className="px-4 py-2 font-medium">Customers</th>
              <th className="px-4 py-2 font-medium">Total sales</th>
              <th className="px-4 py-2 font-medium">Credit sales</th>
              <th className="px-4 py-2 font-medium">Collection</th>
              <th className="px-4 py-2 font-medium">Outstanding</th>
              <th className="px-4 py-2 font-medium">Returns</th>
              {canSeeProfit && <th className="px-4 py-2 font-medium">Profit</th>}
              <th className="px-4 py-2 font-medium">0-15d</th>
              <th className="px-4 py-2 font-medium">16-30d</th>
              <th className="px-4 py-2 font-medium">31-45d</th>
              <th className="px-4 py-2 font-medium">46-60d</th>
              <th className="px-4 py-2 font-medium">61-90d</th>
              <th className="px-4 py-2 font-medium">90+d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.staff_id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{r.staff_name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_count}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.customer_count}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_sales).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.credit_sales).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_collection).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_outstanding).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.sales_return_total).toFixed(2)}</td>
                {canSeeProfit && <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.profit_total).toFixed(2)}</td>}
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_0_15).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_16_30).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_31_45).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_46_60).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_61_90).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.collected_90_plus).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canSeeProfit ? 15 : 14} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No staff activity in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
