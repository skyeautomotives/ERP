import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

const PAGE_SIZE = 20;

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("routes")
    .select("id, name, area, route_days, is_active, user_profiles(full_name)", { count: "exact" });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: routes, count } = await query
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Routes</h1>
          <HelpButton content={HELP_CONTENT["routes"]} />
        </div>
        {can(user, "masters", "create") && (
          <Link
            href="/masters/routes/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New route
          </Link>
        )}
      </div>

      <div className="mt-4">
        <SearchInput placeholder="Search routes..." />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Area</th>
              <th className="px-4 py-2 font-medium">Assigned staff</th>
              <th className="px-4 py-2 font-medium">Days</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(routes ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link href={`/masters/routes/${r.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.area ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.user_profiles?.full_name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{(r.route_days ?? []).join(", ") || "-"}</td>
                <td className="px-4 py-2">
                  <StatusBadge active={r.is_active} />
                </td>
              </tr>
            ))}
            {(!routes || routes.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No routes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </div>
    </div>
  );
}
