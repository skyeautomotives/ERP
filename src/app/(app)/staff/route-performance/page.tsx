import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

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

type RouteRow = {
  route_id: string;
  route_name: string;
  total_sales: number;
  total_collection: number;
  total_outstanding: number;
  customer_count: number;
  profit_total: number;
};

type BreakdownRow = {
  route_name: string;
  staff_name: string | null;
  sales_total: number;
  invoice_count: number;
};

export default async function RoutePerformancePage({
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

  const [{ data: routes }, { data: breakdown }] = await Promise.all([
    supabase.rpc("get_route_performance", { p_from: fromDate, p_to: toDate }),
    supabase.rpc("get_route_staff_breakdown", { p_from: fromDate, p_to: toDate }),
  ]);
  const routeRows = (routes ?? []) as RouteRow[];
  const breakdownRows = (breakdown ?? []) as BreakdownRow[];
  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;

  const qs = (f: string, t: string) => `?from=${f}&to=${t}`;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Route Performance</h1>
        <HelpButton content={HELP_CONTENT["route-performance"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Sales, collection, and outstanding by route over a period, plus which staff sold on each route.
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
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 font-medium">Customers</th>
              <th className="px-4 py-2 font-medium">Total sales</th>
              <th className="px-4 py-2 font-medium">Collection</th>
              <th className="px-4 py-2 font-medium">Outstanding</th>
              {canSeeProfit && <th className="px-4 py-2 font-medium">Profit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {routeRows.map((r) => (
              <tr key={r.route_id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{r.route_name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.customer_count}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_sales).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_collection).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.total_outstanding).toFixed(2)}</td>
                {canSeeProfit && <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.profit_total).toFixed(2)}</td>}
              </tr>
            ))}
            {routeRows.length === 0 && (
              <tr>
                <td colSpan={canSeeProfit ? 6 : 5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No route activity in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Route-wise staff breakdown</p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Route</th>
                <th className="px-4 py-2 font-medium">Staff</th>
                <th className="px-4 py-2 font-medium">Invoices</th>
                <th className="px-4 py-2 font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {breakdownRows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.route_name}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.staff_name ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.invoice_count}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.sales_total).toFixed(2)}</td>
                </tr>
              ))}
              {breakdownRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                    No route/staff activity in this period.
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
