"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreateInvoiceArgs = Database["public"]["Functions"]["create_sales_invoice"]["Args"];

export type InvoiceLineInput = {
  product_id: string;
  quantity: number;
  rate: number;
  discount_percent: number;
};

export type CreateInvoicePayload = {
  sale_type: "credit" | "cash";
  customer_id: string | null;
  cash_customer_name: string | null;
  cash_customer_phone: string | null;
  route_id: string | null;
  staff_id: string | null;
  credit_period_days: number;
  notes: string | null;
  items: InvoiceLineInput[];
};

export async function createSalesInvoice(
  payload: CreateInvoicePayload,
): Promise<{ error: string | null; id?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) {
    return { error: "You don't have permission to create sales." };
  }
  if (payload.items.length === 0) {
    return { error: "Add at least one product line." };
  }

  const supabase = await createClient();
  // The generated Args type marks these as required strings because the SQL function
  // has no DEFAULTs - the columns themselves are nullable and the RPC handles null fine.
  const { data, error } = await supabase.rpc("create_sales_invoice", {
    p_sale_type: payload.sale_type,
    p_customer_id: payload.customer_id,
    p_cash_customer_name: payload.cash_customer_name,
    p_cash_customer_phone: payload.cash_customer_phone,
    p_route_id: payload.route_id,
    p_staff_id: payload.staff_id,
    p_credit_period_days: payload.credit_period_days,
    p_notes: payload.notes,
    p_items: payload.items,
  } as CreateInvoiceArgs);

  if (error) return { error: error.message };

  revalidatePath(`/sales/${payload.sale_type}`);
  redirect(`/sales/${data}`);
}

export async function cancelSalesInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  if (!can(user, "sales", "delete")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sales_invoice", { p_invoice_id: invoiceId });
  if (error) throw new Error(error.message);

  revalidatePath(`/sales/${invoiceId}`);
}
