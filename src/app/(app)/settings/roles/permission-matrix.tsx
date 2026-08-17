"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRolePermission } from "./actions";

type Role = { id: string; name: string; is_system: boolean };
type Permission = { id: string; module_key: string; action: string };

const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;

export function PermissionMatrix({
  roles,
  permissions,
  grantedByRole,
}: {
  roles: Role[];
  permissions: Permission[];
  grantedByRole: Record<string, Set<string>>; // roleId -> set of permissionIds
}) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState(
    roles.find((r) => r.name !== "Admin")?.id ?? roles[0]?.id,
  );
  const [pending, startTransition] = useTransition();

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isAdminRole = selectedRole?.name === "Admin";

  const modules = Array.from(new Set(permissions.map((p) => p.module_key)));
  const permByModuleAction = new Map(permissions.map((p) => [`${p.module_key}:${p.action}`, p.id]));
  const granted = grantedByRole[selectedRoleId ?? ""] ?? new Set<string>();

  function toggle(permissionId: string, checked: boolean) {
    if (!selectedRoleId) return;
    startTransition(async () => {
      await setRolePermission(selectedRoleId, permissionId, checked);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              r.id === selectedRoleId
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {isAdminRole && (
        <p className="mb-3 text-sm text-gray-500">
          Admin always has full access and can&apos;t be restricted here.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Module</th>
              {ACTIONS.map((a) => (
                <th key={a} className="px-4 py-2 text-center font-medium capitalize">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {modules.map((mod) => (
              <tr key={mod}>
                <td className="px-4 py-2 capitalize text-gray-900">{mod}</td>
                {ACTIONS.map((action) => {
                  const permissionId = permByModuleAction.get(`${mod}:${action}`);
                  if (!permissionId) return <td key={action} />;
                  const checked = isAdminRole || granted.has(permissionId);
                  return (
                    <td key={action} className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAdminRole || pending}
                        onChange={(e) => toggle(permissionId, e.target.checked)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
