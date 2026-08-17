import { createClient } from "@/lib/supabase/server";

/** Active users, for "assigned staff" dropdowns across masters (customers, routes, ...). */
export async function getStaffOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  return data ?? [];
}
