"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreateReceiptArgs = Database["public"]["Functions"]["create_receipt"]["Args"];

export type ReceiptAllocationInput = { sales_invoice_id: string; amount_allocated: number };

export type CreateReceiptPayload = {
  method: "cash" | "bank";
  customer_id: string;
  mode: "bill" | "on_account";
  amount: number;
  receipt_date: string;
  reference_number: string | null;
  notes: string | null;
  allocations: ReceiptAllocationInput[];
};

export async function createReceipt(
  payload: CreateReceiptPayload,
): Promise<{ error: string | null; id?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "create")) {
    return { error: "You don't have permission to record receipts." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_receipt", {
    p_method: payload.method,
    p_customer_id: payload.customer_id,
    p_mode: payload.mode,
    p_amount: payload.amount,
    p_receipt_date: payload.receipt_date,
    p_reference_number: payload.reference_number,
    p_notes: payload.notes,
    p_allocations: payload.mode === "bill" ? payload.allocations : [],
  } as CreateReceiptArgs);

  if (error) return { error: error.message };

  revalidatePath(`/accounts/receipts/${payload.method}`);
  redirect(`/accounts/receipts/${data}`);
}

export async function cancelReceipt(receiptId: string) {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "delete")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_receipt", { p_receipt_id: receiptId });
  if (error) throw new Error(error.message);

  revalidatePath(`/accounts/receipts/${receiptId}`);
}
