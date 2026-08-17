import { createClient } from "@/lib/supabase/server";

// Matches the top-level nav in the ERP spec (section 55) and the module_key values
// seeded into public.permissions by supabase/migrations/20260817000001_rbac.sql.
// Finer-grained per-submodule keys get added when those modules are actually built.
export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "inventory", label: "Inventory" },
  { key: "accounts", label: "Accounts" },
  { key: "gst", label: "GST" },
  { key: "staff", label: "Staff" },
  { key: "reports", label: "Reports" },
  { key: "masters", label: "Masters" },
  { key: "settings", label: "Settings" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  roleName: string;
  isActive: boolean;
  permissions: Set<string>;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, is_active, roles(name)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: perms } = await supabase.rpc("my_permissions");

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    roleName: profile.roles?.name ?? "",
    isActive: profile.is_active,
    permissions: new Set((perms ?? []).map((p) => `${p.module_key}:${p.action}`)),
  };
}

/** Admin implicitly has every permission — mirrors public.has_permission()'s DB-side behaviour. */
export function can(user: CurrentUser | null, module: ModuleKey, action: PermissionAction) {
  if (!user) return false;
  if (user.roleName === "Admin") return true;
  return user.permissions.has(`${module}:${action}`);
}
