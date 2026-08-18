"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type CustomerFormState = { error: string | null };

function buildPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    gstin: String(formData.get("gstin") ?? "") || null,
    state: String(formData.get("state") ?? "") || null,
    district: String(formData.get("district") ?? "") || null,
    route_id: String(formData.get("route_id") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    credit_limit: Number(formData.get("credit_limit") ?? 0) || 0,
    credit_period_days: Number(formData.get("credit_period_days") ?? 0) || 0,
    opening_balance: Number(formData.get("opening_balance") ?? 0) || 0,
    opening_balance_type: String(formData.get("opening_balance_type") ?? "debit"),
    assigned_user_id: String(formData.get("assigned_user_id") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create customers." };
  }

  const payload = buildPayload(formData);
  if (!payload.name) return { error: "Customer name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...payload, created_by: user!.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/masters/customers");
  redirect(`/masters/customers/${data.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) {
    return { error: "You don't have permission to edit customers." };
  }

  const payload = buildPayload(formData);
  if (!payload.name) return { error: "Customer name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ ...payload, updated_by: user!.id })
    .eq("id", customerId);

  if (error) return { error: error.message };

  revalidatePath("/masters/customers");
  revalidatePath(`/masters/customers/${customerId}`);
  return { error: null };
}

export async function deleteCustomer(customerId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "delete")) {
    return { error: "You don't have permission to delete customers." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").delete().eq("id", customerId).select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "This customer has existing transactions - deactivate it instead of deleting." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Delete failed - record not found or not permitted." };
  }

  revalidatePath("/masters/customers");
  return { error: null };
}

export async function setCustomerActive(customerId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ is_active: isActive, updated_by: user!.id })
    .eq("id", customerId);

  if (error) throw new Error(error.message);
  revalidatePath("/masters/customers");
}
