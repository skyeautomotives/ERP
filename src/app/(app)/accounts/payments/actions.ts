"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreatePaymentArgs = Database["public"]["Functions"]["create_payment"]["Args"];

export type PaymentAllocationInput = { purchase_invoice_id: string; amount_allocated: number };

export type CreatePaymentPayload = {
  method: "cash" | "bank";
  purpose: "supplier" | "on_account" | "expense";
  supplier_id: string | null;
  expense_category_id: string | null;
  paid_to: string | null;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  allocations: PaymentAllocationInput[];
};

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<{ error: string | null; id?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "create")) {
    return { error: "You don't have permission to record payments." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_payment", {
    p_method: payload.method,
    p_purpose: payload.purpose,
    p_supplier_id: payload.supplier_id,
    p_expense_category_id: payload.expense_category_id,
    p_paid_to: payload.paid_to,
    p_amount: payload.amount,
    p_payment_date: payload.payment_date,
    p_reference_number: payload.reference_number,
    p_notes: payload.notes,
    p_allocations: payload.purpose === "supplier" ? payload.allocations : [],
  } as CreatePaymentArgs);

  if (error) return { error: error.message };

  revalidatePath(`/accounts/payments/${payload.method}`);
  revalidatePath("/accounts/expenses");
  redirect(`/accounts/payments/${data}`);
}

export async function cancelPayment(paymentId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "accounts", "delete")) return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_payment", { p_payment_id: paymentId });
  if (error) return { error: error.message };

  revalidatePath(`/accounts/payments/${paymentId}`);
  revalidatePath("/accounts/expenses");
  return { error: null };
}
