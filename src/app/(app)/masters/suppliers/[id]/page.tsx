import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { RecordHistory } from "@/components/record-history";
import { DeactivateButton } from "@/components/deactivate-button";
import { SupplierForm } from "../supplier-form";
import { updateSupplier, setSupplierActive } from "../actions";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();

  if (!supplier) notFound();

  const boundUpdate = updateSupplier.bind(null, id);
  const canEdit = can(user, "masters", "edit");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{supplier.name}</h1>
        {canEdit && (
          <DeactivateButton id={supplier.id} isActive={supplier.is_active} action={setSupplierActive} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <SupplierForm supplier={supplier} action={boundUpdate} canEdit={canEdit} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">History</h2>
          <RecordHistory table="suppliers" recordId={supplier.id} />
        </div>
      </div>
    </div>
  );
}
