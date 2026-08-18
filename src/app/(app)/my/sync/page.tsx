import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { SyncStatusList } from "./sync-status-list";

export default async function SyncStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sync Status</h1>
        <HelpButton content={HELP_CONTENT["my-sync"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Sales Orders and Receipts saved on this device while offline, and how far along they are syncing.
      </p>

      <SyncStatusList userId={user.id} />
    </div>
  );
}
