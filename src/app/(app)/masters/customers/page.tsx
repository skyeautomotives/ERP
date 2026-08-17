import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { RouteFilter } from "@/components/route-filter";

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; route?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "masters", "view")) redirect("/unauthorized");

  const { q, page: pageParam, route: routeFilter } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone, gstin, category, is_active, routes(name)", { count: "exact" });

  if (q) query = query.ilike("name", `%${q}%`);
  if (routeFilter) query = query.eq("route_id", routeFilter);

  const [{ data: customers, count }, { data: routes }] = await Promise.all([
    query.order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("routes").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customers</h1>
        {can(user, "masters", "create") && (
          <Link
            href="/masters/customers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New customer
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search customers..." />
        <RouteFilter routes={routes ?? []} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">GSTIN</th>
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2">
                  <Link href={`/masters/customers/${c.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.phone ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.gstin ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.routes?.name ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{c.category ?? "-"}</td>
                <td className="px-4 py-2">
                  <StatusBadge active={c.is_active} />
                </td>
              </tr>
            ))}
            {(!customers || customers.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No customers yet.
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
