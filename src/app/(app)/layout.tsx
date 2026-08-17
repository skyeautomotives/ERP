import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, can, MODULES, type ModuleKey } from "@/lib/auth/permissions";
import { logout } from "@/app/login/actions";

const BUILT_MODULES: ModuleKey[] = ["dashboard", "settings"];

const SETTINGS_LINKS = [
  { href: "/settings/company", label: "Company" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/roles", label: "Roles & Permissions" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (!user.isActive) {
    redirect("/unauthorized");
  }

  const visibleModules = MODULES.filter((m) => can(user, m.key, "view"));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">Skye ERP</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{user.fullName}</p>
          <p className="text-xs text-gray-400">{user.roleName}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {visibleModules.map((mod) => {
            const isBuilt = BUILT_MODULES.includes(mod.key);

            if (mod.key === "dashboard") {
              return (
                <Link
                  key={mod.key}
                  href="/dashboard"
                  className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {mod.label}
                </Link>
              );
            }

            if (mod.key === "settings") {
              return (
                <div key={mod.key} className="pt-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {mod.label}
                  </p>
                  {SETTINGS_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              );
            }

            return (
              <div
                key={mod.key}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-400"
                title="This module hasn't been built yet"
              >
                <span>{mod.label}</span>
                {!isBuilt && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <form action={logout} className="border-t border-gray-200 p-2">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
