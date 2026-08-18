import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { WeeklyBarChart } from "@/components/weekly-bar-chart";
import { RealtimeRefresh } from "@/components/realtime-refresh";

const PROFIT_VISIBLE_ROLES = ["Admin", "Accountant", "Management"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeekISO = (base = new Date()) => {
  const day = base.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(base);
  monday.setDate(base.getDate() - diff);
  return monday.toISOString().slice(0, 10);
};
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

type SummaryRow = {
  today_sales: number;
  today_purchase: number;
  today_collection: number;
  today_expenses: number;
  cash_balance: number;
  bank_balance: number;
  customer_outstanding: number;
  supplier_outstanding: number;
  stock_value: number;
  low_stock_count: number;
  gross_profit: number;
  cost_total: number;
};

type WeeklyRow = { day_date: string; sales_total: number; collection_total: number; purchase_total: number; profit_total: number };

type StaffRow = { staff_id: string; staff_name: string; total_sales: number; total_collection: number };

function MetricCard({ label, value, href, tone = "default" }: { label: string; value: string; href: string; tone?: "default" | "warn" }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "warn" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const canSeeProfit = user ? PROFIT_VISIBLE_ROLES.includes(user.roleName) : false;
  const today = todayISO();
  const thisMonday = startOfWeekISO();
  const lastMonday = addDaysISO(thisMonday, -7);

  const supabase = await createClient();
  const [{ data: summaryData }, { data: thisWeekData }, { data: lastWeekData }, { data: staffData }] = await Promise.all([
    supabase.rpc("get_dashboard_summary", {}),
    supabase.rpc("get_weekly_metrics", { p_week_start: thisMonday }),
    supabase.rpc("get_weekly_metrics", { p_week_start: lastMonday }),
    can(user, "staff", "view")
      ? supabase.rpc("get_staff_performance", { p_from: today, p_to: today })
      : Promise.resolve({ data: [] as StaffRow[] }),
  ]);

  const summary = (summaryData?.[0] ?? null) as SummaryRow | null;
  const thisWeek = (thisWeekData ?? []) as WeeklyRow[];
  const lastWeek = (lastWeekData ?? []) as WeeklyRow[];
  const staff = (staffData ?? []) as StaffRow[];

  const profitPercent = summary && Number(summary.cost_total) > 0 ? (Number(summary.gross_profit) / Number(summary.cost_total)) * 100 : 0;
  const topBySales = [...staff].sort((a, b) => Number(b.total_sales) - Number(a.total_sales)).slice(0, 5);
  const topByCollection = [...staff].sort((a, b) => Number(b.total_collection) - Number(a.total_collection)).slice(0, 5);

  const fmt = (n: number | undefined) => `Rs.${Number(n ?? 0).toFixed(2)}`;

  return (
    <div>
      {/* journal_entries deliberately left out - every journal_entries write is itself
          triggered by a write to one of the tables below, so subscribing to it too
          would just refresh this page again for the same underlying change (Phase 14). */}
      <RealtimeRefresh tables={["sales_invoices", "receipts", "receipt_allocations", "payments"]} />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <HelpButton content={HELP_CONTENT["dashboard"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Welcome back, {user?.fullName}. Here's today at a glance.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Today's Sales" value={fmt(summary?.today_sales)} href="/sales/credit" />
        <MetricCard label="Today's Purchase" value={fmt(summary?.today_purchase)} href="/purchase/entries" />
        <MetricCard label="Today's Collection" value={fmt(summary?.today_collection)} href="/staff/collection-report" />
        <MetricCard label="Today's Expenses" value={fmt(summary?.today_expenses)} href="/accounts/expenses" />
        <MetricCard label="Cash Balance" value={fmt(summary?.cash_balance)} href="/accounts/journal?account=1000" />
        <MetricCard label="Bank Balance" value={fmt(summary?.bank_balance)} href="/accounts/journal?account=1010" />
        <MetricCard label="Customer Outstanding" value={fmt(summary?.customer_outstanding)} href="/accounts/outstanding?type=customer" />
        <MetricCard label="Supplier Outstanding" value={fmt(summary?.supplier_outstanding)} href="/accounts/outstanding?type=supplier" />
        <MetricCard label="Stock Value" value={fmt(summary?.stock_value)} href="/inventory/stock" />
        <MetricCard
          label="Low Stock"
          value={String(summary?.low_stock_count ?? 0)}
          href="/inventory/stock?lowStock=1"
          tone={(summary?.low_stock_count ?? 0) > 0 ? "warn" : "default"}
        />
        {canSeeProfit && <MetricCard label="Gross Profit" value={fmt(summary?.gross_profit)} href="/accounts/profit-and-loss" />}
        {canSeeProfit && <MetricCard label="Profit Percentage" value={`${profitPercent.toFixed(1)}%`} href="/accounts/profit-and-loss" />}
      </div>

      {can(user, "staff", "view") && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Today's Staff Sales</p>
              <Link href="/staff/performance" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View full report
              </Link>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {topBySales.map((s) => (
                <div key={s.staff_id} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{s.staff_name}</span>
                  <span className="text-gray-900 dark:text-gray-100">{fmt(s.total_sales)}</span>
                </div>
              ))}
              {topBySales.length === 0 && <p className="text-gray-400 dark:text-gray-500">No sales today yet.</p>}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Today's Staff Collection</p>
              <Link href="/staff/collection-report" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View full report
              </Link>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {topByCollection.map((s) => (
                <div key={s.staff_id} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{s.staff_name}</span>
                  <span className="text-gray-900 dark:text-gray-100">{fmt(s.total_collection)}</span>
                </div>
              ))}
              {topByCollection.length === 0 && <p className="text-gray-400 dark:text-gray-500">No collections today yet.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WeeklyBarChart
          title="Weekly Sales"
          thisWeek={thisWeek.map((d) => ({ day_date: d.day_date, value: Number(d.sales_total) }))}
          lastWeek={lastWeek.map((d) => ({ day_date: d.day_date, value: Number(d.sales_total) }))}
        />
        <WeeklyBarChart
          title="Weekly Collection"
          thisWeek={thisWeek.map((d) => ({ day_date: d.day_date, value: Number(d.collection_total) }))}
          lastWeek={lastWeek.map((d) => ({ day_date: d.day_date, value: Number(d.collection_total) }))}
        />
        <WeeklyBarChart
          title="Weekly Purchase"
          thisWeek={thisWeek.map((d) => ({ day_date: d.day_date, value: Number(d.purchase_total) }))}
          lastWeek={lastWeek.map((d) => ({ day_date: d.day_date, value: Number(d.purchase_total) }))}
        />
        {canSeeProfit && (
          <WeeklyBarChart
            title="Weekly Profit"
            thisWeek={thisWeek.map((d) => ({ day_date: d.day_date, value: Number(d.profit_total) }))}
            lastWeek={lastWeek.map((d) => ({ day_date: d.day_date, value: Number(d.profit_total) }))}
          />
        )}
      </div>
    </div>
  );
}
