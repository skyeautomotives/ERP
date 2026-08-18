"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type RouteFormState = { error: string | null };

function parseRouteDays(formData: FormData): string[] {
  return formData.getAll("route_days").map(String);
}

export async function createRoute(
  _prevState: RouteFormState,
  formData: FormData,
): Promise<RouteFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "create")) {
    return { error: "You don't have permission to create routes." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Route name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routes")
    .insert({
      name,
      area: String(formData.get("area") ?? "") || null,
      assigned_user_id: String(formData.get("assigned_user_id") ?? "") || null,
      route_days: parseRouteDays(formData),
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/masters/routes");
  redirect(`/masters/routes/${data.id}`);
}

export async function updateRoute(
  routeId: string,
  _prevState: RouteFormState,
  formData: FormData,
): Promise<RouteFormState> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) {
    return { error: "You don't have permission to edit routes." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Route name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("routes")
    .update({
      name,
      area: String(formData.get("area") ?? "") || null,
      assigned_user_id: String(formData.get("assigned_user_id") ?? "") || null,
      route_days: parseRouteDays(formData),
      updated_by: user!.id,
    })
    .eq("id", routeId);

  if (error) return { error: error.message };

  revalidatePath("/masters/routes");
  revalidatePath(`/masters/routes/${routeId}`);
  return { error: null };
}

export async function deleteRoute(routeId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "masters", "delete")) {
    return { error: "You don't have permission to delete routes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("routes").delete().eq("id", routeId).select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "This route has existing customers or transactions - deactivate it instead of deleting." };
    }
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Delete failed - record not found or not permitted." };
  }

  revalidatePath("/masters/routes");
  return { error: null };
}

export async function setRouteActive(routeId: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "edit")) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("routes")
    .update({ is_active: isActive, updated_by: user!.id })
    .eq("id", routeId);

  if (error) throw new Error(error.message);
  revalidatePath("/masters/routes");
}
