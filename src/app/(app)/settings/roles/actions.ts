"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";

export async function setRolePermission(roleId: string, permissionId: string, granted: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.roleName !== "Admin") {
    throw new Error("Not authorized.");
  }

  const supabase = await createClient();

  if (granted) {
    const { error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId });
    if (error && error.code !== "23505") throw new Error(error.message); // 23505 = already granted
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/settings/roles");
}
