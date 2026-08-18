"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreateDebitNoteArgs = Database["public"]["Functions"]["create_debit_note"]["Args"];

export type DebitNoteItemInput = { purchase_invoice_item_id: string; quantity: number };

export async function createDebitNote(payload: {
  purchase_invoice_id: string;
  reason: string;
  items: DebitNoteItemInput[];
}): Promise<{ error: string | null } | undefined> {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "create")) {
    return { error: "You don't have permission to create returns." };
  }
  if (payload.items.length === 0) {
    return { error: "Select at least one item to return." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_debit_note", {
    p_purchase_invoice_id: payload.purchase_invoice_id,
    p_reason: payload.reason,
    p_items: payload.items,
  } as CreateDebitNoteArgs);

  if (error) return { error: error.message };

  revalidatePath("/purchase/returns");
  redirect(`/purchase/returns/${data}`);
}

export async function cancelDebitNote(id: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "purchase", "delete")) return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_debit_note", { p_debit_note_id: id });
  if (error) return { error: error.message };

  revalidatePath(`/purchase/returns/${id}`);
  return { error: null };
}
