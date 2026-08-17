import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { CompanyForm } from "./company-form";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function CompanySettingsPage() {
  const user = await getCurrentUser();
  if (!can(user, "settings", "view")) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const { data: company } = await supabase.from("company_settings").select("*").single();

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Company Setup</h1>
        <HelpButton content={HELP_CONTENT["company-settings"]} />
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        This profile is used on printable invoices and reports (section 50 of the spec).
      </p>

      <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <CompanyForm company={company} canEdit={can(user, "settings", "edit")} />
      </div>
    </div>
  );
}
