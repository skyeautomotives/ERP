"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export async function upsertSalesTarget(payload: {
  staff_id: string;
  period_month: number;
  period_year: number;
  target_amount: number;
}): Promise<{ error: string | null } | undefined> {
  const user = await getCurrentUser();
  if (!can(user, "staff", "create")) return { error: "You don't have permission to do this." };
  if (!payload.staff_id) return { error: "Select a staff member." };
  if (!payload.target_amount || payload.target_amount <= 0) return { error: "Enter a positive target amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("staff_sales_targets").upsert(
    {
      staff_id: payload.staff_id,
      period_month: payload.period_month,
      period_year: payload.period_year,
      target_amount: payload.target_amount,
      created_by: user!.id,
      updated_by: user!.id,
    },
    { onConflict: "staff_id,period_month,period_year" },
  );

  if (error) return { error: error.message };
  revalidatePath("/staff/sales-targets");
}
