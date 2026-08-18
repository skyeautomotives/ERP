"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

// Separate from createSupplier (actions.ts) on purpose - see the matching
// comment in masters/customers/quick-create.ts.
export async function quickCreateSupplier(
  data: { name: string; phone?: string },
): Promise<{ error: string | null; id?: string; label?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create suppliers." };
  }

  const name = data.name.trim();
  if (!name) return { error: "Supplier name is required." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("suppliers")
    .insert({ name, phone: data.phone?.trim() || null, created_by: user!.id })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/masters/suppliers");
  return { error: null, id: created.id, label: created.name };
}
