"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreateCreditNoteArgs = Database["public"]["Functions"]["create_credit_note"]["Args"];

export type CreditNoteItemInput = { sales_invoice_item_id: string; quantity: number };

export async function createCreditNote(payload: {
  sales_invoice_id: string;
  reason: string;
  items: CreditNoteItemInput[];
}): Promise<{ error: string | null } | undefined> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) {
    return { error: "You don't have permission to create returns." };
  }
  if (payload.items.length === 0) {
    return { error: "Select at least one item to return." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_credit_note", {
    p_sales_invoice_id: payload.sales_invoice_id,
    p_reason: payload.reason,
    p_items: payload.items,
  } as CreateCreditNoteArgs);

  if (error) return { error: error.message };

  revalidatePath("/sales/returns");
  redirect(`/sales/returns/${data}`);
}

export async function cancelCreditNote(id: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "delete")) return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_credit_note", { p_credit_note_id: id });
  if (error) return { error: error.message };

  revalidatePath(`/sales/returns/${id}`);
  return { error: null };
}
