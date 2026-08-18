import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { NewPeriodForm } from "./new-period-form";
import { GstReturnRow } from "./gst-return-row";
import { ModuleTabs } from "@/components/module-tabs";
import { GST_TABS } from "../gst-tabs";

export default async function GstReturnsPage() {
  const user = await getCurrentUser();
  if (!can(user, "gst", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("gst_return_periods")
    .select("id, period_month, period_year, return_type, status, notes, filed_reference_number")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("return_type");

  return (
    <div>
      <ModuleTabs tabs={GST_TABS} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GST Returns</h1>
        <HelpButton content={HELP_CONTENT["gst-returns"]} />
      </div>
      <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        A checklist to track where each period's return stands - Draft, Verified, Ready for filing, or Filed.{" "}
        <strong className="text-gray-700 dark:text-gray-300">
          This app does not file anything with the government - you still file GSTR-1/GSTR-3B yourself on the GST
          portal.
        </strong>{" "}
        Use this screen only to keep a record of that.
      </p>

      {can(user, "gst", "create") && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <NewPeriodForm />
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Period</th>
              <th className="px-4 py-2 font-medium">Return</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium">Reference #</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(periods ?? []).map((p) => (
              <GstReturnRow key={p.id} period={p} canEdit={can(user, "gst", "edit")} />
            ))}
            {(!periods || periods.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No return periods tracked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
