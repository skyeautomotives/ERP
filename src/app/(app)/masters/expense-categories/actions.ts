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
