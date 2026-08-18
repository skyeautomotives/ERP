"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type CategoryFormState = { error: string | null };

export async function createExpenseCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create expense categories." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").insert({ name, created_by: user!.id });

  if (error) {
    if (error.code === "23505") return { error: "A category with this name already exists." };
    return { error: error.message };
  }

  revalidatePath("/masters/expense-categories");
  return { error: null };
}

export async function deleteExpenseCategory(categoryId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "delete")) {
    return { error: "You don't have permission to delete expense categories." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("expense_categories").delete().eq("id", categoryId).select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "This category has existing payments recorded against it - deactivate it instead of deleting." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Delete failed - record not found or not permitted." };
  }

  revalidatePath("/masters/expense-categories");
  return { error: null };
}

export async function setExpenseCategoryActive(categoryId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update({ is_active: isActive, updated_by: user!.id })
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
  revalidatePath("/masters/expense-categories");
}
