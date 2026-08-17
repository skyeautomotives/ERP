import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { getStaffOptions } from "@/lib/masters/staff-options";
import { RecordHistory } from "@/components/record-history";
import { DeactivateButton } from "@/components/deactivate-button";
import { RouteForm } from "../route-form";
import { updateRoute, setRouteActive } from "../actions";

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: route }, staff] = await Promise.all([
    supabase.from("routes").select("*").eq("id", id).single(),
    getStaffOptions(),
  ]);

  if (!route) notFound();

  const boundUpdate = updateRoute.bind(null, id);
  const canEdit = can(user, "masters", "edit");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{route.name}</h1>
        {canEdit && (
          <DeactivateButton
            id={route.id}
            isActive={route.is_active}
            action={setRouteActive}
          />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 lg:col-span-2">
          <RouteForm route={route} staff={staff} action={boundUpdate} canEdit={canEdit} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">History</h2>
          <RecordHistory table="routes" recordId={route.id} />
        </div>
      </div>
    </div>
  );
}
