import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ModuleTabs } from "@/components/module-tabs";
import { INVENTORY_TABS } from "../inventory-tabs";

const WINDOWS = [30, 60, 90];

export default async function MovementAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "inventory", "view")) redirect("/unauthorized");

  const { days: daysParam } = await searchParams;
  const days = WINDOWS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_movement_analysis", { p_days: days });

  const sorted = rows ?? [];
  const fastMoving = sorted.filter((r) => Number(r.total_sold) > 0).slice(0, 10);
  const slowMoving = sorted.filter((r) => Number(r.total_sold) === 0);

  return (
    <div>
      <ModuleTabs tabs={INVENTORY_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Movement Analysis</h1>
        <HelpButton content={HELP_CONTENT["movement-analysis"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Which products are selling and which are sitting still, over the last {days} days.
      </p>

      <div className="mt-4 flex gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/inventory/analysis?days=${w}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              days === w
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Last {w} days
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Fast moving (top 10)</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Qty sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {fastMoving.map((r) => (
                  <tr key={r.product_id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {r.code} - {r.name}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.total_sold}</td>
                  </tr>
                ))}
                {fastMoving.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      No sales in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Slow moving (no sales in {days} days)
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {slowMoving.map((r) => (
                  <tr key={r.product_id}>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {r.code} - {r.name}
                    </td>
                  </tr>
                ))}
                {slowMoving.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                      Every active product has sold in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
