import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, can, MODULES, type ModuleKey } from "@/lib/auth/permissions";
import { logout } from "@/app/login/actions";
import { SidebarShell } from "@/components/sidebar-shell";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { SyncBadge } from "@/components/sync-badge";
import { BackButton } from "@/components/back-button";

const BUILT_MODULES: ModuleKey[] = ["dashboard", "masters", "sales", "purchase", "inventory", "accounts", "gst", "staff", "settings"];

type SubLink = { href: string; label: string; comingSoon?: boolean };

// Modules whose sub-screens are switched via an in-page tab bar (ModuleTabs)
// instead of a sidebar sub-list - the sidebar just links straight to the
// default tab. Dashboard has always worked this way (a single screen, no
// sub-nav at all); every other built module now follows the same pattern.
const SINGLE_LINK_MODULES: Partial<Record<ModuleKey, string>> = {
  dashboard: "/dashboard",
  sales: "/sales/credit",
  purchase: "/purchase/entries",
  inventory: "/inventory/stock",
  accounts: "/accounts/receipts/cash",
  gst: "/gst/gstr1",
  staff: "/staff/performance",
};

const SUB_LINKS: Partial<Record<ModuleKey, SubLink[]>> = {
  masters: [
    { href: "/masters/customers", label: "Customers" },
    { href: "/masters/suppliers", label: "Suppliers" },
    { href: "/masters/products", label: "Products" },
    { href: "/masters/routes", label: "Routes" },
    { href: "/masters/expense-categories", label: "Expense Categories" },
    { href: "/masters/chart-of-accounts", label: "Chart of Accounts" },
  ],
  settings: [
    { href: "/settings/company", label: "Company" },
    { href: "/settings/users", label: "Users" },
    { href: "/settings/roles", label: "Roles & Permissions" },
    { href: "/settings/import", label: "Data Import / Export" },
  ],
};

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <OfflineSyncManager userId={user.id} />
      <SidebarShell>
      <aside className="no-print flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 lg:sticky lg:top-0 lg:h-screen">
        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Skye ERP</p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{user.fullName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{user.roleName}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          <Link
            href="/my/dashboard"
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            My Workspace
            <SyncBadge userId={user.id} />
          </Link>
          {visibleModules.map((mod) => {
            const isBuilt = BUILT_MODULES.includes(mod.key);

            const singleLinkHref = SINGLE_LINK_MODULES[mod.key];
            if (singleLinkHref) {
              return (
                <Link
                  key={mod.key}
                  href={singleLinkHref}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {mod.label}
                </Link>
              );
            }

            const subLinks = SUB_LINKS[mod.key];
            if (subLinks) {
              return (
                <div key={mod.key} className="pt-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {mod.label}
                  </p>
                  {subLinks.map((link) =>
                    link.comingSoon ? (
                      <div
                        key={link.href}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-500"
                        title="This screen hasn't been built yet"
                      >
                        <span>{link.label}</span>
                        <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          Coming soon
                        </span>
                      </div>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              );
            }

            return (
              <div
                key={mod.key}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-500"
                title="This module hasn't been built yet"
              >
                <span>{mod.label}</span>
                {!isBuilt && (
                  <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <form action={logout} className="border-t border-gray-200 dark:border-gray-800 p-2">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign out
          </button>
        </form>
      </aside>
      </SidebarShell>

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 p-4 lg:p-6">
        <BackButton />
        {children}
      </main>
    </div>
  );
}
