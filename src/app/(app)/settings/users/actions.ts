"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";

export async function setUserActive(userId: string, isActive: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.roleName !== "Admin") {
    throw new Error("Not authorized.");
  }
  if (userId === currentUser.id && !isActive) {
    throw new Error("You can't deactivate your own account.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ is_active: isActive, updated_by: currentUser.id })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/users");
}
