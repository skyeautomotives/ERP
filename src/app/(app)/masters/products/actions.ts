"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type ProductFormState = { error: string | null };

function numOrNull(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    brand: String(formData.get("brand") ?? "") || null,
    product_group: String(formData.get("product_group") ?? "") || null,
    product_sub_group: String(formData.get("product_sub_group") ?? "") || null,
    hsn_code: String(formData.get("hsn_code") ?? "") || null,
    unit: String(formData.get("unit") ?? "") || null,
    pack_size: String(formData.get("pack_size") ?? "") || null,
    mrp: numOrNull(formData, "mrp"),
    purchase_rate: numOrNull(formData, "purchase_rate"),
    selling_rate: numOrNull(formData, "selling_rate"),
    landing_cost: numOrNull(formData, "landing_cost"),
    gst_percent: numOrNull(formData, "gst_percent") ?? 0,
    opening_qty: numOrNull(formData, "opening_qty") ?? 0,
    opening_value: numOrNull(formData, "opening_value") ?? 0,
    min_stock_level: numOrNull(formData, "min_stock_level") ?? 0,
    max_stock_level: numOrNull(formData, "max_stock_level"),
    batch_number: String(formData.get("batch_number") ?? "") || null,
    expiry_date: String(formData.get("expiry_date") ?? "") || null,
  };
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create products." };
  }

  const payload = buildPayload(formData);
  if (!payload.code) return { error: "Product code is required." };
  if (!payload.name) return { error: "Product name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...payload, created_by: user!.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A product with this code already exists." };
    return { error: error.message };
  }

  revalidatePath("/masters/products");
  redirect(`/masters/products/${data.id}`);
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) {
    return { error: "You don't have permission to edit products." };
  }

  const payload = buildPayload(formData);
  if (!payload.code) return { error: "Product code is required." };
  if (!payload.name) return { error: "Product name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ ...payload, updated_by: user!.id })
    .eq("id", productId);

  if (error) {
    if (error.code === "23505") return { error: "A product with this code already exists." };
    return { error: error.message };
  }

  revalidatePath("/masters/products");
  revalidatePath(`/masters/products/${productId}`);
  return { error: null };
}

export async function deleteProduct(productId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "delete")) {
    return { error: "You don't have permission to delete products." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", productId).select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "This product has existing transactions - deactivate it instead of deleting." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Delete failed - record not found or not permitted." };
  }

  revalidatePath("/masters/products");
  return { error: null };
}

export async function setProductActive(productId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_by: user!.id })
    .eq("id", productId);

  if (error) throw new Error(error.message);
  revalidatePath("/masters/products");
}
