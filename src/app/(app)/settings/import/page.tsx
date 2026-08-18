import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";
import { ImportForm } from "./import-form";

export default async function DataImportPage() {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "Admin") {
    redirect("/unauthorized");
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Import / Export</h1>
        <HelpButton content={HELP_CONTENT["settings-import"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Bulk-load customers, products, and opening stock from a legacy-system export, or download the current data in
        the same format.
      </p>

      <ImportForm />
    </div>
  );
}
