import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { PermissionMatrix } from "./permission-matrix";

export default async function RolesSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!can(currentUser, "settings", "view")) {
    redirect("/unauthorized");
  }

  if (currentUser?.roleName !== "Admin") {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Roles & Permissions</h1>
        <p className="mt-4 text-sm text-gray-500">Only Admins can view the permission matrix.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: roles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
    supabase.from("roles").select("id, name, is_system").order("name"),
    supabase.from("permissions").select("id, module_key, action"),
    supabase.from("role_permissions").select("role_id, permission_id"),
  ]);

  const grantedByRole: Record<string, Set<string>> = {};
  for (const rp of rolePermissions ?? []) {
    if (!grantedByRole[rp.role_id]) grantedByRole[rp.role_id] = new Set();
    grantedByRole[rp.role_id].add(rp.permission_id);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Roles & Permissions</h1>
      <p className="mt-1 text-sm text-gray-500">
        Configure what each role can see and do, module by module (section 5 of the spec).
      </p>

      <div className="mt-6">
        <PermissionMatrix
          roles={roles ?? []}
          permissions={permissions ?? []}
          grantedByRole={grantedByRole}
        />
      </div>
    </div>
  );
}
