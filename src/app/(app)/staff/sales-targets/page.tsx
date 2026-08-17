import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { TargetForm } from "./target-form";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function SalesTargetsPage() {
  const user = await getCurrentUser();
  if (!can(user, "staff", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [staff, { data: targets }] = await Promise.all([
    getStaffOptions(),
    supabase
      .from("staff_sales_targets")
      .select("id, period_month, period_year, target_amount, user_profiles(full_name)")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false }),
  ]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sales Targets</h1>
        <HelpButton content={HELP_CONTENT["sales-targets"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Set a monthly sales target per staff member - the Incentive Dashboard uses this to show achievement.
      </p>

      {can(user, "staff", "create") && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <TargetForm staff={staff.map((s) => ({ id: s.id, label: s.full_name }))} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Staff</th>
              <th className="px-4 py-2 font-medium">Period</th>
              <th className="px-4 py-2 font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(targets ?? []).map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{t.user_profiles?.full_name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {MONTH_NAMES[t.period_month - 1]} {t.period_year}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(t.target_amount).toFixed(2)}</td>
              </tr>
            ))}
            {(!targets || targets.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No targets set yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
