import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { SlabRateCell } from "./slab-rate-cell";

export default async function IncentiveSlabsPage() {
  const user = await getCurrentUser();
  if (!can(user, "staff", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: slabs } = await supabase
    .from("collection_incentive_slabs")
    .select("id, slab_label, min_days, max_days, incentive_rate")
    .order("display_order");

  const canEdit = can(user, "staff", "edit");

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Collection Incentive Slabs</h1>
        <HelpButton content={HELP_CONTENT["incentive-slabs"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        How much incentive a collection earns, based on how many days after the invoice date it was collected.
        Faster collection earns more.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Collection period</th>
              <th className="px-4 py-2 font-medium">Days</th>
              <th className="px-4 py-2 font-medium">Incentive rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(slabs ?? []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{s.slab_label}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {s.max_days === null ? `${s.min_days}+` : s.min_days === s.max_days ? `${s.min_days}` : `${s.min_days}-${s.max_days}`}
                </td>
                <td className="px-4 py-2">
                  <SlabRateCell id={s.id} initialRate={Number(s.incentive_rate)} canEdit={canEdit} />
                </td>
              </tr>
            ))}
            {(!slabs || slabs.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No slabs configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
