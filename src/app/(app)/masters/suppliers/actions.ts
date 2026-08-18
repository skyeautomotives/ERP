"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type SupplierFormState = { error: string | null };

function buildPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    gstin: String(formData.get("gstin") ?? "") || null,
    state: String(formData.get("state") ?? "") || null,
    credit_period_days: Number(formData.get("credit_period_days") ?? 0) || 0,
    opening_balance: Number(formData.get("opening_balance") ?? 0) || 0,
    opening_balance_type: String(formData.get("opening_balance_type") ?? "credit"),
    bank_name: String(formData.get("bank_name") ?? "") || null,
    bank_account_number: String(formData.get("bank_account_number") ?? "") || null,
    bank_ifsc: String(formData.get("bank_ifsc") ?? "") || null,
    contact_person: String(formData.get("contact_person") ?? "") || null,
  };
}

export async function createSupplier(
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create suppliers." };
  }

  const payload = buildPayload(formData);
  if (!payload.name) return { error: "Supplier name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...payload, created_by: user!.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/masters/suppliers");
  redirect(`/masters/suppliers/${data.id}`);
}

export async function updateSupplier(
  supplierId: string,
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) {
    return { error: "You don't have permission to edit suppliers." };
  }

  const payload = buildPayload(formData);
  if (!payload.name) return { error: "Supplier name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ ...payload, updated_by: user!.id })
    .eq("id", supplierId);

  if (error) return { error: error.message };

  revalidatePath("/masters/suppliers");
  revalidatePath(`/masters/suppliers/${supplierId}`);
  return { error: null };
}

export async function deleteSupplier(supplierId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "delete")) {
    return { error: "You don't have permission to delete suppliers." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").delete().eq("id", supplierId).select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "This supplier has existing transactions - deactivate it instead of deleting." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Delete failed - record not found or not permitted." };
  }

  revalidatePath("/masters/suppliers");
  return { error: null };
}

export async function setSupplierActive(supplierId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ is_active: isActive, updated_by: user!.id })
    .eq("id", supplierId);

  if (error) throw new Error(error.message);
  revalidatePath("/masters/suppliers");
}
