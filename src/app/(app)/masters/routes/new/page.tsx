import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { RouteForm } from "../route-form";
import { createRoute } from "../actions";

export default async function NewRoutePage() {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) redirect("/unauthorized");

  const staff = await getStaffOptions();

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New route</h1>
      <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <RouteForm staff={staff} action={createRoute} canEdit />
      </div>
    </div>
  );
}
