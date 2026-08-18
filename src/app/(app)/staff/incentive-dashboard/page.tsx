import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ModuleTabs } from "@/components/module-tabs";
import { STAFF_TABS } from "../staff-tabs";

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

type Row = {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  sales_incentive: number;
  collection_incentive: number;
  total_incentive: number;
  target: number | null;
  achievement_percent: number | null;
  collection_percent: number | null;
  avg_collection_days: number | null;
  outstanding_generated: number;
  outstanding_collected: number;
  outstanding_90_plus: number;
};

export default async function IncentiveDashboardPage({
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

  const { data } = await supabase.rpc("get_incentive_dashboard", { p_from: fromDate, p_to: toDate });
  const rows = (data ?? []) as Row[];

  const qs = (f: string, t: string) => `?from=${f}&to=${t}`;

  return (
    <div>
      <ModuleTabs tabs={STAFF_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Incentive Dashboard</h1>
        <HelpButton content={HELP_CONTENT["incentive-dashboard"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Sales and collection incentive per staff member, computed from the rates on Incentive Slabs and Settings &gt;
        Company, plus targets from Sales Targets.
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
              <th className="px-4 py-2 font-medium">Sales incentive</th>
              <th className="px-4 py-2 font-medium">Collection incentive</th>
              <th className="px-4 py-2 font-medium">Total incentive</th>
              <th className="px-4 py-2 font-medium">Target</th>
              <th className="px-4 py-2 font-medium">Achievement</th>
              <th className="px-4 py-2 font-medium">Collection %</th>
              <th className="px-4 py-2 font-medium">Avg. collection days</th>
              <th className="px-4 py-2 font-medium">Outstanding generated</th>
              <th className="px-4 py-2 font-medium">Outstanding collected</th>
              <th className="px-4 py-2 font-medium">90+ day outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.staff_id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{r.staff_name}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.sales_incentive).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.collection_incentive).toFixed(2)}</td>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{Number(r.total_incentive).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.target != null ? Number(r.target).toFixed(2) : "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.achievement_percent != null ? `${r.achievement_percent}%` : "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.collection_percent != null ? `${r.collection_percent}%` : "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.avg_collection_days != null ? r.avg_collection_days : "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.outstanding_generated).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.outstanding_collected).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.outstanding_90_plus).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
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
