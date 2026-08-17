import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { UserForm } from "./user-form";
import { UserRowActions } from "./user-row-actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function UsersSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!can(currentUser, "settings", "view")) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const [{ data: roles }, { data: users, error: usersError }] = await Promise.all([
    supabase.from("roles").select("id, name").order("name"),
    supabase.rpc("admin_list_users"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Users</h1>
            <HelpButton content={HELP_CONTENT["users"]} />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Only Admins can create accounts or change access - self sign-up is disabled.
          </p>
        </div>
        {currentUser?.roleName === "Admin" && <UserForm roles={roles ?? []} />}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {usersError ? (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
            You don&apos;t have permission to view the user list.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{u.full_name}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{u.role_name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <UserRowActions
                      userId={u.id}
                      isActive={u.is_active}
                      isSelf={u.id === currentUser?.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
