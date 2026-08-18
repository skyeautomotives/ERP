"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

// Separate from createCustomer (actions.ts) on purpose - that one redirects
// to the new customer's detail page, which is right for Masters > New
// Customer but wrong here: this is called from inside a Sales Entry form
// that needs to stay open and just add the new customer to its own dropdown.
export async function quickCreateCustomer(
  data: { name: string; phone?: string },
): Promise<{ error: string | null; id?: string; label?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create customers." };
  }

  const name = data.name.trim();
  if (!name) return { error: "Customer name is required." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("customers")
    .insert({ name, phone: data.phone?.trim() || null, created_by: user!.id })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/masters/customers");
  return { error: null, id: created.id, label: created.name };
}
