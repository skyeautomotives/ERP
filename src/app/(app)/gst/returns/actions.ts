"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

const NEXT_STATUS: Record<string, string> = {
  draft: "verified",
  verified: "ready_for_filing",
  ready_for_filing: "filed",
};

export async function createGstReturnPeriod(payload: {
  period_month: number;
  period_year: number;
  return_type: "GSTR-1" | "GSTR-3B";
}): Promise<{ error: string | null } | undefined> {
  const user = await getCurrentUser();
  if (!can(user, "gst", "create")) return { error: "You don't have permission to do this." };

  const supabase = await createClient();
  const { error } = await supabase.from("gst_return_periods").insert({
    period_month: payload.period_month,
    period_year: payload.period_year,
    return_type: payload.return_type,
    created_by: user!.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/gst/returns");
}

export async function advanceGstReturnStatus(id: string, currentStatus: string) {
  const user = await getCurrentUser();
  if (!can(user, "gst", "edit")) throw new Error("Not authorized.");

  const nextStatus = NEXT_STATUS[currentStatus];
  if (!nextStatus) throw new Error("This return is already fully filed.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("gst_return_periods")
    .update({ status: nextStatus, status_updated_by: user!.id, status_updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/gst/returns");
}

export async function updateGstReturnNotes(id: string, notes: string, filedReferenceNumber: string) {
  const user = await getCurrentUser();
  if (!can(user, "gst", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("gst_return_periods")
    .update({ notes: notes || null, filed_reference_number: filedReferenceNumber || null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/gst/returns");
}
