import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";

const PAGE_SIZE = 20;

export default async function ProductsPage({
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
    .from("products")
    .select("id, code, name, brand, product_group, selling_rate, gst_percent, is_active", { count: "exact" });

  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const { data: products, count } = await query
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Products</h1>
        {can(user, "masters", "create") && (
          <Link
            href="/masters/products/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New product
          </Link>
        )}
      </div>

      <div className="mt-4">
        <SearchInput placeholder="Search by name or code..." />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Brand</th>
              <th className="px-4 py-2 font-medium">Group</th>
              <th className="px-4 py-2 font-medium">Selling rate</th>
              <th className="px-4 py-2 font-medium">GST %</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(products ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.code}</td>
                <td className="px-4 py-2">
                  <Link href={`/masters/products/${p.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.brand ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.product_group ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.selling_rate ?? "-"}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{p.gst_percent}</td>
                <td className="px-4 py-2">
                  <StatusBadge active={p.is_active} />
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No products yet.
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
