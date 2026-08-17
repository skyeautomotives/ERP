"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreatePurchaseArgs = Database["public"]["Functions"]["create_purchase_invoice"]["Args"];

export type PurchaseLineInput = {
  product_id: string;
  quantity: number;
  rate: number;
  discount_percent: number;
};

export type CreatePurchasePayload = {
  supplier_id: string | null;
  supplier_invoice_number: string;
  supplier_invoice_date: string;
  notes: string | null;
  items: PurchaseLineInput[];
  overrideDuplicate?: boolean;
};

export async function createPurchaseInvoice(
  payload: CreatePurchasePayload,
): Promise<{ error: string | null; duplicate?: boolean; id?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "create")) {
    return { error: "You don't have permission to create purchases." };
  }
  if (!payload.supplier_id) {
    return { error: "Supplier is required." };
  }
  if (payload.items.length === 0) {
    return { error: "Add at least one product line." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_purchase_invoice", {
    p_supplier_id: payload.supplier_id,
    p_supplier_invoice_number: payload.supplier_invoice_number,
    p_supplier_invoice_date: payload.supplier_invoice_date,
    p_notes: payload.notes,
    p_items: payload.items,
    p_override_duplicate: payload.overrideDuplicate ?? false,
  } as CreatePurchaseArgs);

  if (error) {
    if (error.message.includes("DUPLICATE_SUPPLIER_INVOICE")) {
      return { error: null, duplicate: true };
    }
    return { error: error.message };
  }

  revalidatePath("/purchase/entries");
  redirect(`/purchase/entries/${data}`);
}

export async function cancelPurchaseInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "delete")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_purchase_invoice", { p_invoice_id: invoiceId });
  if (error) throw new Error(error.message);

  revalidatePath(`/purchase/entries/${invoiceId}`);
}

export async function recordPurchaseVerification(
  invoiceId: string,
  supplierTaxableValue: number,
  supplierGstTotal: number,
  supplierTotal: number,
  notes: string | null,
): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "edit")) {
    return { error: "You don't have permission to record verification." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_purchase_verification", {
    p_invoice_id: invoiceId,
    p_supplier_taxable_value: supplierTaxableValue,
    p_supplier_gst_total: supplierGstTotal,
    p_supplier_total: supplierTotal,
    p_notes: notes,
  } as Database["public"]["Functions"]["record_purchase_verification"]["Args"]);

  if (error) return { error: error.message };

  revalidatePath(`/purchase/entries/${invoiceId}`);
  revalidatePath("/purchase/verification");
  return { error: null };
}
