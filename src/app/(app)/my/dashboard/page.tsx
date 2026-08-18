import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { RealtimeRefresh } from "@/components/realtime-refresh";

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return monday.toISOString().slice(0, 10);
};

type StaffRow = {
  staff_id: string;
  total_sales: number;
  invoice_count: number;
  total_collection: number;
  total_outstanding: number;
};

type CollectionRow = {
  staff_name: string | null;
  customer_name: string | null;
  invoice_number: string;
  payment_date: string;
  collection_amount: number;
  days_taken: number;
  collection_status: string;
};

const fmt = (n: number | undefined | null) => `Rs.${Number(n ?? 0).toFixed(2)}`;

export default async function MyDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayISO();
  const weekStart = startOfWeekISO();
  const supabase = await createClient();

  const [{ data: routes }, { data: customers }, { data: todayPerf }, { data: weekPerf }, { data: collections }] =
    await Promise.all([
      supabase.from("routes").select("id, name, area, route_days").eq("assigned_user_id", user.id).eq("is_active", true),
      supabase.from("customers").select("id").eq("assigned_user_id", user.id).eq("is_active", true),
      supabase.rpc("get_staff_performance", { p_from: today, p_to: today }),
      supabase.rpc("get_staff_performance", { p_from: weekStart, p_to: today }),
      supabase.rpc("get_collection_detail", { p_from: weekStart, p_to: today }),
    ]);

  const todayRow = ((todayPerf ?? []) as StaffRow[]).find((r) => r.staff_id === user.id) ?? null;
  const weekRow = ((weekPerf ?? []) as StaffRow[]).find((r) => r.staff_id === user.id) ?? null;
  const myCollections = ((collections ?? []) as CollectionRow[])
    .filter((c) => c.staff_name === user.fullName)
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
    .slice(0, 5);

  return (
    <div>
      <RealtimeRefresh tables={["sales_invoices", "receipts", "receipt_allocations"]} />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Workspace</h1>
        <HelpButton content={HELP_CONTENT["my-dashboard"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your own customers, route, sales, and collections.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Today's sales</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{fmt(todayRow?.total_sales)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{todayRow?.invoice_count ?? 0} invoices</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">This week's sales</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{fmt(weekRow?.total_sales)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">This week's collection</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{fmt(weekRow?.total_collection)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">My outstanding</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{fmt(weekRow?.total_outstanding)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/my/customers"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-800"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">My customers</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{customers?.length ?? 0}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">View all &rarr;</p>
        </Link>

        <Link
          href="/my/sync"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-800"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">Sync status</p>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
            Sales Orders and Receipts saved while offline on this device.
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">View &rarr;</p>
        </Link>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">My route{(routes ?? []).length === 1 ? "" : "s"}</p>
          {(routes ?? []).length === 0 && <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">No route assigned.</p>}
          {(routes ?? []).map((r) => (
            <div key={r.id} className="mt-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {r.area ?? "-"} - {(r.route_days ?? []).join(", ") || "No days set"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent collections</p>
          <Link href="/my/collections" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-2 space-y-2 text-sm">
          {myCollections.map((c, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1 last:border-0">
              <div>
                <p className="text-gray-900 dark:text-gray-100">{c.customer_name ?? "-"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.invoice_number} - {c.payment_date} - {c.collection_status}
                </p>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(c.collection_amount)}</span>
            </div>
          ))}
          {myCollections.length === 0 && <p className="text-gray-400 dark:text-gray-500">No collections this week yet.</p>}
        </div>
      </div>
    </div>
  );
}
