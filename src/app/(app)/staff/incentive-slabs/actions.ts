"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export async function updateSlabRate(id: string, rate: number) {
  const user = await getCurrentUser();
  if (!can(user, "staff", "edit")) throw new Error("Not authorized.");
  if (Number.isNaN(rate) || rate < 0) throw new Error("Rate must be a positive number.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_incentive_slabs")
    .update({ incentive_rate: rate, updated_by: user!.id })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/staff/incentive-slabs");
}
