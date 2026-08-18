"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

// Separate from createProduct (actions.ts) on purpose - see the matching
// comment in masters/customers/quick-create.ts. `rate` seeds both
// purchase_rate and selling_rate as a starting default - editable later from
// Masters > Products, same as everything else this doesn't ask for.
export async function quickCreateProduct(data: {
  code: string;
  name: string;
  unit?: string;
  gst_percent?: number;
  rate?: number;
}): Promise<{
  error: string | null;
  id?: string;
  label?: string;
  code?: string;
  name?: string;
  default_rate?: number | null;
  gst_percent?: number;
}> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create products." };
  }

  const code = data.code.trim();
  const name = data.name.trim();
  if (!code) return { error: "Product code is required." };
  if (!name) return { error: "Product name is required." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      code,
      name,
      unit: data.unit?.trim() || null,
      gst_percent: data.gst_percent ?? 0,
      purchase_rate: data.rate ?? null,
      selling_rate: data.rate ?? null,
      created_by: user!.id,
    })
    .select("id, code, name, selling_rate, gst_percent")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A product with this code already exists." };
    return { error: error.message };
  }

  revalidatePath("/masters/products");
  return {
    error: null,
    id: created.id,
    label: `${created.code} - ${created.name}`,
    code: created.code,
    name: created.name,
    default_rate: created.selling_rate,
    gst_percent: Number(created.gst_percent),
  };
}
