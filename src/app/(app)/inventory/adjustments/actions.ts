"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CreateAdjustmentArgs = Database["public"]["Functions"]["create_stock_adjustment"]["Args"];

export type AdjustmentFormState = { error: string | null; success: boolean };

export async function createStockAdjustment(
  _prevState: AdjustmentFormState,
  formData: FormData,
): Promise<AdjustmentFormState> {
  const user = await getCurrentUser();
  if (!can(user, "inventory", "create")) {
    return { error: "You don't have permission to record stock adjustments.", success: false };
  }

  const productId = String(formData.get("product_id") ?? "");
  const direction = String(formData.get("direction") ?? "increase");
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "") || null;

  if (!productId) return { error: "Select a product.", success: false };
  if (!quantity || quantity <= 0) return { error: "Enter a positive quantity.", success: false };
  if (!reason) return { error: "Enter a reason for this adjustment.", success: false };

  const signedQuantity = direction === "decrease" ? -quantity : quantity;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_stock_adjustment", {
    p_product_id: productId,
    p_quantity_change: signedQuantity,
    p_reason: reason,
    p_notes: notes,
  } as CreateAdjustmentArgs);

  if (error) return { error: error.message, success: false };

  revalidatePath("/inventory/adjustments");
  revalidatePath("/inventory/stock");
  return { error: null, success: true };
}
